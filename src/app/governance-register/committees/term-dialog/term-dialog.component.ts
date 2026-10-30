/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIcon } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { KymMemberPickerComponent } from 'app/clients/kym/member-picker/member-picker.component';
import { KymPerson } from 'app/clients/kym/kym.models';
import { GovernanceRegisterService } from '../../governance-register.service';
import { applyServerErrors, isoDate } from '../../governance-register.utils';
import { Committee, Person, PersonListItem, Position, Term } from '../../governance-register.models';
import { MeetingsService } from '../../meetings/meetings.service';
import { Decision } from '../../meetings/meetings.models';

export interface TermDialogData {
  /** Only the committee's id and name are read; the person page passes these straight off a Term. */
  committee: Pick<Committee, 'id' | 'name'>;
  /** Set to change the position of a term already current, instead of adding a new one */
  changePositionOf?: Term;
}

/**
 * Gives a person a term on a committee, or changes their position inside the elected period they are serving
 * (fineract-dbug #138). A term cannot start in the future.
 *
 * Adding a person offers the register's existing people first, but someone who isn't registered yet isn't a
 * dead end: choosing "somebody new" here registers them (the same way the People screen's "Add a person" does)
 * and gives them the term in the same step, instead of silently leaving Submit disabled with no explanation.
 */
@Component({
  selector: 'mifosx-term-dialog',
  templateUrl: './term-dialog.component.html',
  styleUrls: ['./term-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    NgTemplateOutlet,
    MatDialogModule,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatStepperModule,
    MatIcon,
    NepaliDateInputComponent,
    KymMemberPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TermDialogComponent {
  readonly data = inject<TermDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<TermDialogComponent, Term>);
  private governance = inject(GovernanceRegisterService);
  private meetingsService = inject(MeetingsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly positions = signal<Position[]>([]);
  readonly changingPosition = !!this.data.changePositionOf;
  readonly today = new Date();

  // ---- picking an existing registered person

  readonly personSearch = new FormControl('');
  readonly foundPeople = signal<PersonListItem[]>([]);
  readonly searched = signal(false);
  readonly pickedPerson = signal<PersonListItem | Pick<Person, 'id' | 'name'> | null>(
    this.data.changePositionOf
      ? { id: this.data.changePositionOf.personId, name: this.data.changePositionOf.personName }
      : null
  );

  // ---- registering somebody not yet in the register, in the same step

  readonly addingNewPerson = signal(false);
  readonly newPersonIsMember = signal(true);
  readonly newMember = signal<KymPerson | null>(null);
  readonly newPersonName = new FormControl('', Validators.maxLength(200));

  // ---- linking the term to a decision recorded in a meeting (fineract-dbug #141)

  readonly decisionSearch = new FormControl('');
  readonly foundDecisions = signal<Decision[]>([]);
  readonly decisionSearched = signal(false);
  readonly pickedDecision = signal<Decision | null>(null);

  get personReady(): boolean {
    if (this.changingPosition || this.pickedPerson()) {
      return true;
    }
    return this.addingNewPerson() && (!!this.newMember() || !!this.newPersonName.value?.trim());
  }

  readonly form = inject(FormBuilder).group({
    positionId: [
      this.data.changePositionOf?.positionId ?? (null as number | null),
      Validators.required
    ],
    on: [
      this.today,
      Validators.required
    ],
    expectedEndOn: [null as Date | null],
    decisionReference: [
      '',
      Validators.maxLength(200)
    ],
    note: [
      '',
      Validators.maxLength(1000)
    ]
  });

  constructor() {
    this.governance.positions().subscribe((p) => this.positions.set(p.filter((x) => x.active)));
    this.personSearch.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string' && v.trim().length >= 2),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.searched.set(true)),
        switchMap((v) => this.governance.people(v.trim())),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe((r) => this.foundPeople.set(r));

    this.decisionSearch.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string' && v.trim().length >= 2),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.decisionSearched.set(true)),
        switchMap((v) => this.meetingsService.decisions(undefined, this.data.committee.id, undefined, v)),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe((r) => this.foundDecisions.set(r));
  }

  pickPerson(p: PersonListItem): void {
    this.pickedPerson.set(p);
    this.personSearch.setValue('');
    this.foundPeople.set([]);
  }

  pickDecision(d: Decision): void {
    this.pickedDecision.set(d);
    this.form.controls.decisionReference.setValue(d.reference);
    this.decisionSearch.setValue('');
    this.foundDecisions.set([]);
  }

  clearDecision(): void {
    this.pickedDecision.set(null);
    this.form.controls.decisionReference.setValue('');
  }

  startAddingNewPerson(): void {
    this.addingNewPerson.set(true);
    this.foundPeople.set([]);
    this.personSearch.setValue('');
  }

  positionLabel(p: Position): string {
    return p.code.startsWith('OWN_') ? p.name : `governanceRegister.position.${p.code}`;
  }

  save(): void {
    if (this.form.invalid || !this.personReady) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);

    if (this.changingPosition) {
      this.governance
        .changePosition(this.data.changePositionOf!.id, {
          positionId: v.positionId,
          on: isoDate(v.on),
          decisionReference: v.decisionReference?.trim() || null,
          decisionId: this.pickedDecision()?.id ?? null,
          note: v.note?.trim() || null
        })
        .subscribe({
          next: (t) => this.ref.close(t),
          error: (e) => {
            this.busy.set(false);
            this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
          }
        });
      return;
    }

    const existing = this.pickedPerson();
    if (existing) {
      this.addTermFor(existing.id, v);
      return;
    }

    // Registering somebody new, then seating them, as one action.
    const member = this.newMember();
    const body: Record<string, unknown> = member
      ? { clientId: member.clientId }
      : { name: this.newPersonName.value?.trim() };
    this.governance.createPerson(body).subscribe({
      next: (p) => this.addTermFor(p.id, v),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
      }
    });
  }

  private addTermFor(personId: number, v: ReturnType<typeof this.form.getRawValue>): void {
    this.governance
      .addTerm({
        personId,
        committeeId: this.data.committee.id,
        positionId: v.positionId,
        startOn: isoDate(v.on),
        expectedEndOn: isoDate(v.expectedEndOn),
        decisionReference: v.decisionReference?.trim() || null,
        decisionId: this.pickedDecision()?.id ?? null,
        note: v.note?.trim() || null
      })
      .subscribe({
        next: (t) => this.ref.close(t),
        error: (e) => {
          this.busy.set(false);
          this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
        }
      });
  }
}
