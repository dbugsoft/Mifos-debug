/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardAvatar, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { TranslateService } from '@ngx-translate/core';
import { filter, switchMap } from 'rxjs';

import { ClientActionNotifierService } from 'app/clients/clients-view/client-actions/client-action-notifier.service';
import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import {
  MemberAddressDialogComponent,
  MemberAddressDialogData
} from '../member-address-dialog/member-address-dialog.component';
import { MemberAddress, MemberAddressType } from '../member-address.model';
import { MemberAddressService } from '../member-address.service';
import { MemberAddressSummaryComponent } from '../member-address-summary/member-address-summary.component';

interface AddressCard {
  type: MemberAddressType;
  icon: IconProp;
  required: boolean;
  address: MemberAddress | null;
  /** Why the address cannot be removed right now, or null if it can. */
  removeBlockedReason: string | null;
}

/**
 * A member's permanent and temporary address (Fineract ADR-0014). Replaces Fineract's generic Address tab.
 *
 * The list is always re-read from the server after a change, so what is shown is what was saved, including a
 * temporary address that follows an edited permanent one.
 */
@Component({
  selector: 'mifosx-member-address-tab',
  templateUrl: './member-address-tab.component.html',
  styleUrls: ['./member-address-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatCardAvatar,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatProgressBar,
    MatTooltip,
    MemberAddressSummaryComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberAddressTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly addressService = inject(MemberAddressService);
  private readonly notifier = inject(ClientActionNotifierService);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly clientId = this.route.parent?.snapshot.paramMap.get('clientId') ?? '';

  readonly addresses = signal<MemberAddress[] | null>(null);
  readonly loadFailed = signal(false);

  private readonly permanent = computed(() => this.find('PERMANENT'));
  private readonly temporary = computed(() => this.find('TEMPORARY'));
  readonly missingPermanent = computed(() => this.addresses() !== null && !this.permanent());

  readonly cards = computed<AddressCard[]>(() => [
    {
      type: 'PERMANENT',
      icon: 'home',
      required: true,
      address: this.permanent(),
      removeBlockedReason: this.temporary()?.sameAsPermanent ? 'clients.memberAddress.hints.permanentInUse' : null
    },
    {
      type: 'TEMPORARY',
      icon: 'location-arrow',
      required: false,
      address: this.temporary(),
      removeBlockedReason: null
    }
  ]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadFailed.set(false);
    this.addressService
      .getAddresses(this.clientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (addresses) => this.addresses.set(addresses ?? []),
        error: () => this.loadFailed.set(true)
      });
  }

  open(card: AddressCard): void {
    const data: MemberAddressDialogData = {
      clientId: this.clientId,
      addressType: card.type,
      address: card.address,
      permanentAddress: this.permanent()
    };
    this.dialog
      .open<MemberAddressDialogComponent, MemberAddressDialogData, boolean>(MemberAddressDialogComponent, {
        data,
        autoFocus: 'first-tabbable',
        maxWidth: '95vw'
      })
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notifier.notify('clients.memberAddress.messages.saved');
        this.load();
      });
  }

  remove(card: AddressCard): void {
    if (!card.address || card.removeBlockedReason) {
      return;
    }
    const type = this.translateService.instant(`clients.memberAddress.types.${card.type}`);
    this.dialog
      .open(DeleteDialogComponent, { data: { deleteContext: type } })
      .afterClosed()
      .pipe(
        filter((response) => !!response?.delete),
        switchMap(() => this.addressService.delete(this.clientId, card.type)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.notifier.notify('clients.memberAddress.messages.removed');
        this.load();
      });
  }

  private find(type: MemberAddressType): MemberAddress | null {
    return this.addresses()?.find((address) => address.addressType === type) ?? null;
  }
}
