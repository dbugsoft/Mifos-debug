/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { finalize } from 'rxjs';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MemberAddress, MemberAddressRequest, MemberAddressType } from '../member-address.model';
import { createMemberAddressForm, patchMemberAddressForm, toMemberAddressRequest } from '../member-address-form';
import { MemberAddressFieldsComponent } from '../member-address-fields/member-address-fields.component';
import { MemberAddressService } from '../member-address.service';
import { MemberAddressSummaryComponent } from '../member-address-summary/member-address-summary.component';
import { NepalLocationIndex } from '../nepal-location-index';
import { NepalLocationService } from '../nepal-location.service';

export interface MemberAddressDialogData {
  clientId: number | string;
  addressType: MemberAddressType;
  /** The saved address when editing; absent when adding. */
  address?: MemberAddress | null;
  /** The member's permanent address, which a temporary address may follow. */
  permanentAddress?: MemberAddress | null;
}

/**
 * Adds or edits one of a member's addresses and saves it. Closes with `true` once saved; stays open on an error so
 * nothing typed is lost (the error itself is shown by the app's HTTP error handler).
 */
@Component({
  selector: 'mifosx-member-address-dialog',
  templateUrl: './member-address-dialog.component.html',
  styleUrls: ['./member-address-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatProgressBar,
    MatSlideToggle,
    MemberAddressFieldsComponent,
    MemberAddressSummaryComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberAddressDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<MemberAddressDialogComponent, boolean>>(MatDialogRef);
  private readonly addressService = inject(MemberAddressService);
  private readonly locationService = inject(NepalLocationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly data = inject<MemberAddressDialogData>(MAT_DIALOG_DATA);

  readonly form = createMemberAddressForm();
  readonly sameAsPermanent = new FormControl(false, { nonNullable: true });

  readonly isEdit = !!this.data.address;
  readonly isTemporary = this.data.addressType === 'TEMPORARY';
  readonly canFollowPermanent = this.isTemporary && !!this.data.permanentAddress;
  /** Only an address that already has its own location keeps a merged local level selectable. */
  readonly savedLocalLevelCode =
    this.data.address && !this.data.address.sameAsPermanent ? this.data.address.localLevelCode : null;

  readonly locations = signal<NepalLocationIndex | null>(null);
  readonly loadFailed = signal(false);
  readonly saving = signal(false);
  readonly followingPermanent = signal(false);
  private readonly formStatus = signal(this.form.status);

  readonly canSave = computed(
    () => !this.saving() && (this.followingPermanent() || (!!this.locations() && this.formStatus() === 'VALID'))
  );

  constructor() {
    this.dialogRef.disableClose = true;
    if (this.data.address) {
      patchMemberAddressForm(this.form, this.data.address);
    }

    this.sameAsPermanent.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((follow) => {
      this.followingPermanent.set(follow);
      if (follow) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    });
    this.form.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => this.formStatus.set(status));

    if (!this.canFollowPermanent) {
      this.sameAsPermanent.disable({ emitEvent: false });
    }
    this.sameAsPermanent.setValue(!!this.data.address?.sameAsPermanent && this.canFollowPermanent);

    this.loadLocations();
  }

  loadLocations(): void {
    this.loadFailed.set(false);
    this.locationService
      .locations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (index) => this.locations.set(index),
        error: () => this.loadFailed.set(true)
      });
  }

  save(): void {
    if (!this.canSave()) {
      this.form.markAllAsTouched();
      return;
    }
    const request: MemberAddressRequest = this.sameAsPermanent.value
      ? { sameAsPermanent: true }
      : { sameAsPermanent: false, ...toMemberAddressRequest(this.form) };
    const { clientId, addressType } = this.data;
    const call = this.isEdit
      ? this.addressService.update(clientId, addressType, request)
      : this.addressService.create(clientId, addressType, request);

    this.saving.set(true);
    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => undefined
    });
  }
}
