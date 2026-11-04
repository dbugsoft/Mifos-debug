/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { StandingService } from '../../standing.service';
import { isoDate, parseDate } from '../../../elections/elections.utils';
import { Listing } from '../../standing.models';

export interface RemoveDialogData {
  listing: Listing;
}

/** Takes a member off the blacklist, not before they were listed and not in the future (fineract-dbug #144). */
@Component({
  selector: 'mifosx-remove-dialog',
  templateUrl: './remove-dialog.component.html',
  styleUrls: ['./remove-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RemoveDialogComponent {
  readonly data = inject<RemoveDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<RemoveDialogComponent, Listing>);
  private standing = inject(StandingService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly today = new Date();
  readonly minDate = parseDate(this.data.listing.listedOn) ?? this.today;

  readonly removedOn = new FormControl(this.today, Validators.required);

  save(): void {
    if (this.removedOn.invalid) {
      this.removedOn.markAsTouched();
      return;
    }
    this.busy.set(true);
    this.serverError.set(null);
    this.standing.removeListing(this.data.listing.id, isoDate(this.removedOn.value) ?? '').subscribe({
      next: (l) => this.ref.close(l),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(e?.error?.defaultUserMessage || e?.error?.errors?.[0]?.defaultUserMessage || null);
      }
    });
  }
}
