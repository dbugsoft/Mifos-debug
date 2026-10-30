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
import { MeetingsService } from '../../meetings.service';
import { applyServerErrors } from '../../meetings.utils';
import { Decision, Meeting } from '../../meetings.models';

export interface DecisionDialogData {
  meetingId: number;
  /** Changing a decision already recorded */
  decision?: Decision;
}

/** Records or changes a decision of a draft meeting (fineract-dbug #141). */
@Component({
  selector: 'mifosx-decision-dialog',
  templateUrl: './decision-dialog.component.html',
  styleUrls: ['./decision-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DecisionDialogComponent {
  readonly data = inject<DecisionDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<DecisionDialogComponent, Meeting>);
  private meetingsService = inject(MeetingsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly editing = !!this.data.decision;

  readonly form = inject(FormBuilder).group({
    subject: [
      this.data.decision?.subject ?? '',
      [
        Validators.required,
        Validators.maxLength(300)
      ]
    ],
    wording: [
      this.data.decision?.wording ?? '',
      [
        Validators.required,
        Validators.maxLength(8000)
      ]
    ],
    number: [this.data.decision?.number ?? (null as number | null)]
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);

    const call = this.editing
      ? this.meetingsService.updateDecision(this.data.decision!.id, { subject: v.subject, wording: v.wording })
      : this.meetingsService.addDecision(this.data.meetingId, {
          subject: v.subject,
          wording: v.wording,
          number: v.number
        });

    call.subscribe({
      next: (m) => this.ref.close(m),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
      }
    });
  }
}
