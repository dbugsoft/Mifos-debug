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
import { Committee } from '../../../governance-register.models';
import { MeetingsService } from '../../meetings.service';
import { applyServerErrors, isoDate } from '../../meetings.utils';
import { Meeting } from '../../meetings.models';

export interface CreateMeetingDialogData {
  committees: Committee[];
}

/** Records a meeting, once held: POST /nepal/governance/meetings (fineract-dbug #141). */
@Component({
  selector: 'mifosx-create-meeting-dialog',
  templateUrl: './create-meeting-dialog.component.html',
  styleUrls: ['./create-meeting-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateMeetingDialogComponent {
  readonly data = inject<CreateMeetingDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<CreateMeetingDialogComponent, Meeting>);
  private meetingsService = inject(MeetingsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly today = new Date();

  readonly form = inject(FormBuilder).group({
    kind: [
      'COMMITTEE',
      Validators.required
    ],
    committeeId: [null as number | null],
    heldOn: [
      this.today,
      Validators.required
    ],
    place: [
      '',
      Validators.maxLength(300)
    ],
    agenda: [
      '',
      Validators.maxLength(4000)
    ],
    membersPresent: [null as number | null],
    attendanceNote: [
      '',
      Validators.maxLength(1000)
    ]
  });

  get isCommittee(): boolean {
    return this.form.controls.kind.value === 'COMMITTEE';
  }

  save(): void {
    this.form.controls.committeeId.setValidators(this.isCommittee ? Validators.required : null);
    this.form.controls.membersPresent.setValidators(this.isCommittee ? null : Validators.required);
    this.form.controls.committeeId.updateValueAndValidity();
    this.form.controls.membersPresent.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    this.meetingsService
      .create({
        kind: v.kind,
        committeeId: this.isCommittee ? v.committeeId : null,
        heldOn: isoDate(v.heldOn),
        place: v.place?.trim() || null,
        agenda: v.agenda?.trim() || null,
        membersPresent: this.isCommittee ? null : v.membersPresent,
        attendanceNote: v.attendanceNote?.trim() || null
      })
      .subscribe({
        next: (m) => this.ref.close(m),
        error: (e) => {
          this.busy.set(false);
          this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
        }
      });
  }
}
