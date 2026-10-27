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
import { ManagementReportsService } from '../../management-reports.service';
import { applyServerErrors, isoDate, parseDate } from '../../management-reports.utils';
import { Office, Period, Report } from '../../management-reports.models';

export interface CreateReportDialogData {
  /** A period shortcut picked on the list page, to pre-fill the dates */
  period?: Period;
  offices: Office[];
  /** Making a corrected report: the approved one it replaces */
  replaces?: Report;
}

/** Generates a draft management report for a period: POST /nepal/management-reports (fineract-dbug #142). */
@Component({
  selector: 'mifosx-create-report-dialog',
  templateUrl: './create-report-dialog.component.html',
  styleUrls: ['./create-report-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateReportDialogComponent {
  readonly data = inject<CreateReportDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<CreateReportDialogComponent, Report>);
  private reportsService = inject(ManagementReportsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly today = new Date();
  readonly offices = this.data.offices;

  readonly form = inject(FormBuilder).group({
    from: [
      parseDate(this.data.period?.from) ?? (this.data.replaces ? parseDate(this.data.replaces.from) : null),
      Validators.required
    ],
    to: [
      parseDate(this.data.period?.to) ?? (this.data.replaces ? parseDate(this.data.replaces.to) : null),
      Validators.required
    ],
    officeId: [this.data.replaces?.officeId ?? (null as number | null)],
    notes: [
      '',
      Validators.maxLength(4000)
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
    this.reportsService
      .create({
        from: isoDate(v.from),
        to: isoDate(v.to),
        officeId: v.officeId,
        notes: v.notes?.trim() || null,
        replacesId: this.data.replaces?.id ?? null
      })
      .subscribe({
        next: (r) => this.ref.close(r),
        error: (e) => {
          this.busy.set(false);
          this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
        }
      });
  }
}
