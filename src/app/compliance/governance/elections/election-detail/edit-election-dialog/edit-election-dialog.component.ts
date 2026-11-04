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
import { ElectionsService } from '../../elections.service';
import { applyServerErrors, isoDate, parseDate } from '../../elections.utils';
import { Election } from '../../elections.models';
import { DecisionPickerComponent } from '../../decision-picker/decision-picker.component';
import { Decision } from 'app/governance-register/meetings/meetings.models';

export interface EditElectionDialogData {
  election: Election;
}

/**
 * Changes an election's own details (fineract-dbug #144). While it is still OPEN, the cut-off day, the minimum
 * membership and the calling decision can change too; past that, only the title, the election day and the note -
 * the committees never change, at any point.
 */
@Component({
  selector: 'mifosx-edit-election-dialog',
  templateUrl: './edit-election-dialog.component.html',
  styleUrls: ['./edit-election-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    NepaliDateInputComponent,
    DecisionPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditElectionDialogComponent {
  readonly data = inject<EditElectionDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<EditElectionDialogComponent, Election>);
  private electionsService = inject(ElectionsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly canEditAll = this.data.election.status === 'OPEN';
  readonly today = new Date();

  readonly pickedDecision = signal<Pick<Decision, 'id' | 'reference'> | null>(
    this.data.election.calledByDecisionId
      ? { id: this.data.election.calledByDecisionId, reference: this.data.election.calledByDecision ?? '' }
      : null
  );

  readonly form = inject(FormBuilder).group({
    title: [
      this.data.election.title,
      [
        Validators.required,
        Validators.maxLength(200)
      ]
    ],
    electionOn: [
      parseDate(this.data.election.electionOn),
      Validators.required
    ],
    cutOffOn: [
      parseDate(this.data.election.cutOffOn),
      Validators.required
    ],
    minMembershipMonths: [
      this.data.election.minMembershipMonths,
      [
        Validators.min(0),
        Validators.max(240)
      ]
    ],
    note: [
      this.data.election.note ?? '',
      Validators.maxLength(1000)
    ]
  });

  pickDecision(d: Decision): void {
    this.pickedDecision.set(d);
  }

  clearDecision(): void {
    this.pickedDecision.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const changes: Record<string, unknown> = {
      title: v.title?.trim(),
      electionOn: isoDate(v.electionOn),
      note: v.note?.trim() || null
    };
    if (this.canEditAll) {
      changes.cutOffOn = isoDate(v.cutOffOn);
      changes.minMembershipMonths = v.minMembershipMonths;
      changes.decisionId = this.pickedDecision()?.id ?? null;
    }
    this.busy.set(true);
    this.serverError.set(null);
    this.electionsService.update(this.data.election.id, changes).subscribe({
      next: (updated) => this.ref.close(updated),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
      }
    });
  }
}
