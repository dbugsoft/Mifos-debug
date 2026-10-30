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
import { MeetingsService } from '../../meetings.service';
import { isoDate } from '../../meetings.utils';
import { Meeting } from '../../meetings.models';

export interface ApproveMeetingDialogData {
  meetingId: number;
  heldOn: string;
}

/** Fixes a draft meeting: command=approve {approvedOn} (fineract-dbug #141). Needs the signed minutes attached. */
@Component({
  selector: 'mifosx-approve-meeting-dialog',
  templateUrl: './approve-meeting-dialog.component.html',
  styleUrls: ['./approve-meeting-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApproveMeetingDialogComponent {
  readonly data = inject<ApproveMeetingDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ApproveMeetingDialogComponent, Meeting>);
  private meetingsService = inject(MeetingsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly today = new Date();

  readonly form = inject(FormBuilder).group({
    approvedOn: [
      this.today,
      Validators.required
    ]
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.serverError.set(null);
    this.meetingsService.approve(this.data.meetingId, isoDate(this.form.controls.approvedOn.value) ?? '').subscribe({
      next: (m) => this.ref.close(m),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(e?.error?.defaultUserMessage || e?.error?.errors?.[0]?.defaultUserMessage || null);
      }
    });
  }
}
