/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { GovernanceRegisterService } from 'app/governance-register/governance-register.service';
import { BUILT_IN_COMMITTEE_CODES, Committee } from 'app/governance-register/governance-register.models';
import { ElectionsService } from '../../elections.service';
import { applyServerErrors, isoDate } from '../../elections.utils';
import { Election } from '../../elections.models';
import { DecisionPickerComponent } from '../../decision-picker/decision-picker.component';
import { Decision } from 'app/governance-register/meetings/meetings.models';

/**
 * Sets up a new election, over the board and the accounts supervision committee by default (fineract-dbug #144).
 * cutOffOn must not be after electionOn; leaving minMembershipMonths empty takes the previous election's number,
 * or 12 at the first.
 */
@Component({
  selector: 'mifosx-election-setup-dialog',
  templateUrl: './election-setup-dialog.component.html',
  styleUrls: ['./election-setup-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    NepaliDateInputComponent,
    DecisionPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ElectionSetupDialogComponent {
  private governance = inject(GovernanceRegisterService);
  private electionsService = inject(ElectionsService);
  private ref = inject(MatDialogRef<ElectionSetupDialogComponent, Election>);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly committees = signal<Committee[]>([]);
  readonly builtInCodes = BUILT_IN_COMMITTEE_CODES;
  readonly today = new Date();

  readonly pickedDecision = signal<Decision | null>(null);
  readonly advancedOpen = signal(false);
  readonly committeesTouched = signal(false);
  readonly selectedCommittees = signal<Set<number>>(new Set());

  readonly form = inject(FormBuilder).group({
    title: [
      '',
      [
        Validators.required,
        Validators.maxLength(200)
      ]
    ],
    electionOn: [
      null as Date | null,
      Validators.required
    ],
    cutOffOn: [
      null as Date | null,
      Validators.required
    ],
    minMembershipMonths: [
      null as number | null,
      [
        Validators.min(0),
        Validators.max(240)
      ]
    ],
    note: [
      '',
      Validators.maxLength(1000)
    ]
  });

  constructor() {
    this.governance.committees(undefined, false).subscribe((c) => this.committees.set(c));
  }

  committeeLabel(c: Committee): string {
    return this.builtInCodes.includes(c.code) ? `governanceRegister.committee.${c.code}` : c.name;
  }

  /** The calling decision is the board's own - scopes the decision picker to it, same as the results dialog scopes
   * its own picker to the general meeting. */
  get boardCommitteeId(): number | undefined {
    return this.committees().find((c) => c.code === 'BOARD')?.id;
  }

  toggleCommittee(c: Committee, e: MatCheckboxChange): void {
    this.committeesTouched.set(true);
    const selected = new Set(this.selectedCommittees());
    if (e.checked) {
      selected.add(c.id);
    } else {
      selected.delete(c.id);
    }
    this.selectedCommittees.set(selected);
  }

  pickDecision(d: Decision): void {
    this.pickedDecision.set(d);
  }

  clearDecision(): void {
    this.pickedDecision.set(null);
  }

  get cutOffAfterElection(): boolean {
    const on = this.form.controls.electionOn.value;
    const cutOff = this.form.controls.cutOffOn.value;
    return !!on && !!cutOff && cutOff.getTime() > on.getTime();
  }

  /** Whether the form is currently in a submittable state - same condition `save()` itself checks. */
  get canSubmit(): boolean {
    return this.form.valid && !this.cutOffAfterElection;
  }

  save(): void {
    if (this.form.invalid || this.cutOffAfterElection) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    this.electionsService
      .create({
        title: v.title?.trim(),
        electionOn: isoDate(v.electionOn),
        cutOffOn: isoDate(v.cutOffOn),
        minMembershipMonths: v.minMembershipMonths,
        committeeIds: this.committeesTouched() ? Array.from(this.selectedCommittees()) : null,
        decisionId: this.pickedDecision()?.id ?? null,
        note: v.note?.trim() || null
      })
      .subscribe({
        next: (created) => this.ref.close(created),
        error: (e) => {
          this.busy.set(false);
          this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
        }
      });
  }
}
