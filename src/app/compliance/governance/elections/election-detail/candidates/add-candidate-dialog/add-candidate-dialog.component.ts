/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { KymMemberPickerComponent } from 'app/clients/kym/member-picker/member-picker.component';
import { KymPerson } from 'app/clients/kym/kym.models';
import { GovernanceRegisterService } from 'app/governance-register/governance-register.service';
import { BUILT_IN_COMMITTEE_CODES, Committee, Position } from 'app/governance-register/governance-register.models';
import { ElectionsService } from '../../../elections.service';
import { applyServerErrors, isoDate } from '../../../elections.utils';
import { Election, Nomination } from '../../../elections.models';

export interface AddCandidateDialogData {
  election: Election;
}

/**
 * Nominates a member for a committee and position of an election being rolled, once the voter roll has been
 * frozen (fineract-dbug #144). A refusal is not a failure: the candidate is saved either way, and the server's
 * problems are shown so the clerk knows why.
 */
@Component({
  selector: 'mifosx-add-candidate-dialog',
  templateUrl: './add-candidate-dialog.component.html',
  styleUrls: ['./add-candidate-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    NepaliDateInputComponent,
    KymMemberPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddCandidateDialogComponent {
  readonly data = inject<AddCandidateDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<AddCandidateDialogComponent, Election>);
  private governance = inject(GovernanceRegisterService);
  private electionsService = inject(ElectionsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly positions = signal<Position[]>([]);
  readonly member = signal<KymPerson | null>(null);
  readonly builtInCodes = BUILT_IN_COMMITTEE_CODES;
  readonly today = new Date();

  /** Set once a refused candidate is saved - not a failure, so the dialog stays open to show why. */
  readonly refused = signal<Nomination | null>(null);
  private lastResult: Election | null = null;

  readonly form = inject(FormBuilder).group({
    committeeId: [
      null as number | null,
      Validators.required
    ],
    positionId: [
      null as number | null,
      Validators.required
    ],
    proposedBy: [
      '',
      Validators.maxLength(200)
    ],
    nominatedOn: [null as Date | null]
  });

  constructor() {
    this.governance.positions().subscribe((p) => this.positions.set(p.filter((x) => x.active)));
  }

  committeeLabel(c: Pick<Committee, 'code' | 'name'>): string {
    return this.builtInCodes.includes(c.code) ? `governanceRegister.committee.${c.code}` : c.name;
  }

  positionLabel(p: Position): string {
    return p.code.startsWith('OWN_') ? p.name : `governanceRegister.position.${p.code}`;
  }

  /** Whether the form is currently in a submittable state - same condition `save()` itself checks. */
  get canSubmit(): boolean {
    return this.form.valid && !!this.member();
  }

  save(): void {
    const m = this.member();
    if (this.form.invalid || !m) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    this.electionsService
      .addNomination(this.data.election.id, {
        clientId: m.clientId,
        committeeId: v.committeeId,
        positionId: v.positionId,
        proposedBy: v.proposedBy?.trim() || null,
        nominatedOn: isoDate(v.nominatedOn)
      })
      .subscribe({
        next: (updated) => {
          this.busy.set(false);
          const newest = updated.nominations.find((n) => n.clientId === m.clientId) ?? null;
          if (newest?.status === 'REFUSED') {
            this.refused.set(newest);
            this.lastResult = updated;
          } else {
            this.ref.close(updated);
          }
        },
        error: (e) => {
          this.busy.set(false);
          this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
        }
      });
  }

  done(): void {
    this.ref.close(this.lastResult ?? undefined);
  }
}
