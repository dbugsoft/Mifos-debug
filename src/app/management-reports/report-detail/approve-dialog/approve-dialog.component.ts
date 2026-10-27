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
import { ManagementReportsService } from '../../management-reports.service';
import { applyServerErrors } from '../../management-reports.utils';
import { Report } from '../../management-reports.models';

export interface ApproveDialogData {
  report: Report;
  action: 'approve' | 'return';
}

/**
 * Records the board's decision on a submitted report (fineract-dbug #142): `command=approve`/`return` with the
 * `decisionId` of the board meeting's decision. The Meetings screens (#141's frontend) aren't built yet, so there
 * is no decision picker here - the clerk types the decision's numeric id directly, exactly as the backend requires
 * it, rather than a free-text citation the API would not accept.
 */
@Component({
  selector: 'mifosx-approve-dialog',
  templateUrl: './approve-dialog.component.html',
  styleUrls: ['./approve-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApproveDialogComponent {
  readonly data = inject<ApproveDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ApproveDialogComponent, Report>);
  private reportsService = inject(ManagementReportsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = inject(FormBuilder).group({
    decisionId: [
      null as number | null,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],
    note: [
      '',
      Validators.maxLength(1000)
    ]
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    const call =
      this.data.action === 'approve'
        ? this.reportsService.approve(this.data.report.id, v.decisionId!, v.note?.trim() || null)
        : this.reportsService.returnReport(this.data.report.id, v.decisionId!, v.note?.trim() || null);

    call.subscribe({
      next: (r) => this.ref.close(r),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
      }
    });
  }
}
