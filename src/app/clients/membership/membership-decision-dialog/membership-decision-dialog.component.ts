/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { MembershipService } from '../membership.service';
import { MembershipApplication } from '../membership.models';

export interface MembershipDecisionData {
  application: MembershipApplication;
  decision: 'approve' | 'reject';
}

/**
 * The board's decision on a membership application. Approving activates the member, opens the member savings account
 * and buys the shares in one step; if Fineract refuses any part, nothing changes and the dialog stays open (the error
 * itself is shown by the global error handler). Refusing needs the reason the applicant will be told.
 */
@Component({
  selector: 'mifosx-membership-decision-dialog',
  templateUrl: './membership-decision-dialog.component.html',
  styleUrls: ['./membership-decision-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    NepaliDateInputComponent,
    FormatNumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipDecisionDialogComponent {
  private dialogRef = inject<MatDialogRef<MembershipDecisionDialogComponent, MembershipApplication>>(MatDialogRef);
  private membershipService = inject(MembershipService);
  private settingsService = inject(SettingsService);
  private dates = inject(Dates);
  private formBuilder = inject(FormBuilder);
  readonly data = inject<MembershipDecisionData>(MAT_DIALOG_DATA);

  readonly approve = this.data.decision === 'approve';
  readonly application = this.data.application;
  readonly minDate = this.fromIso(this.application.submittedOn);
  readonly maxDate = this.settingsService.businessDate ?? new Date();
  readonly busy = signal(false);

  readonly form = this.formBuilder.group({
    date: [
      this.maxDate as Date | null,
      Validators.required
    ],
    reason: [
      '',
      this.approve ? [] : [
            Validators.required,
            Validators.maxLength(1000)
          ]
    ]
  });

  submit(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const date = this.dates.formatDate(this.form.value.date, 'yyyy-MM-dd');
    const call = this.approve
      ? this.membershipService.approve(this.application.id, date)
      : this.membershipService.reject(this.application.id, (this.form.value.reason ?? '').trim(), date);
    call.subscribe({
      next: (decided) => this.dialogRef.close(decided),
      error: () => this.busy.set(false)
    });
  }

  private fromIso(iso: string): Date {
    const [
      y,
      m,
      d
    ] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
