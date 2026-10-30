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
import { Decision, Meeting } from '../../meetings.models';

export interface CorrectionDialogData {
  meetingId: number;
  decisions: Decision[];
}

/** Adds a correction to an approved meeting, about the meeting as a whole or one decision (fineract-dbug #141). */
@Component({
  selector: 'mifosx-correction-dialog',
  templateUrl: './correction-dialog.component.html',
  styleUrls: ['./correction-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CorrectionDialogComponent {
  readonly data = inject<CorrectionDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<CorrectionDialogComponent, Meeting>);
  private meetingsService = inject(MeetingsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly file = signal<File | null>(null);

  readonly form = inject(FormBuilder).group({
    correction: [
      '',
      [
        Validators.required,
        Validators.maxLength(2000)
      ]
    ],
    decisionId: [null as number | null]
  });

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    this.meetingsService.addCorrection(this.data.meetingId, v.correction!.trim(), v.decisionId, this.file()).subscribe({
      next: (m) => this.ref.close(m),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(e?.error?.defaultUserMessage || e?.error?.errors?.[0]?.defaultUserMessage || null);
      }
    });
  }
}
