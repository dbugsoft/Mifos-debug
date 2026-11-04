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
import { StandingService } from '../../standing.service';
import { isoDate } from '../../../elections/elections.utils';
import { Listing } from '../../standing.models';

export interface BlacklistDialogData {
  clientId: number | null;
}

/** Adds a member to the blacklist, with an optional scanned notice (fineract-dbug #144). Kept, never deleted. */
@Component({
  selector: 'mifosx-blacklist-dialog',
  templateUrl: './blacklist-dialog.component.html',
  styleUrls: ['./blacklist-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    NepaliDateInputComponent,
    KymMemberPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlacklistDialogComponent {
  readonly data = inject<BlacklistDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<BlacklistDialogComponent, Listing>);
  private standing = inject(StandingService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly file = signal<File | null>(null);
  readonly member = signal<KymPerson | null>(null);
  readonly today = new Date();

  readonly form = inject(FormBuilder).group({
    listedOn: [
      this.today,
      Validators.required
    ],
    reason: [
      '',
      [
        Validators.required,
        Validators.maxLength(500)
      ]
    ],
    listedByBody: [
      '',
      Validators.maxLength(200)
    ],
    removedOn: [null as Date | null]
  });

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  save(): void {
    const clientId = this.data.clientId ?? this.member()?.clientId;
    if (this.form.invalid || !clientId) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    this.standing
      .addListing(
        {
          clientId: String(clientId),
          listedOn: isoDate(v.listedOn) ?? '',
          reason: v.reason!.trim(),
          listedByBody: v.listedByBody?.trim() || '',
          removedOn: isoDate(v.removedOn) ?? ''
        },
        this.file()
      )
      .subscribe({
        next: (l) => this.ref.close(l),
        error: (e) => {
          this.busy.set(false);
          this.serverError.set(e?.error?.defaultUserMessage || e?.error?.errors?.[0]?.defaultUserMessage || null);
        }
      });
  }
}
