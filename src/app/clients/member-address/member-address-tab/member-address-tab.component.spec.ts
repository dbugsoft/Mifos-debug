/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faEdit,
  faExclamationTriangle,
  faHome,
  faLink,
  faLocationArrow,
  faPlus,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { ClientActionNotifierService } from 'app/clients/clients-view/client-actions/client-action-notifier.service';
import { MemberAddressDialogComponent } from '../member-address-dialog/member-address-dialog.component';
import { MemberAddress } from '../member-address.model';
import { MemberAddressService } from '../member-address.service';
import { mockAddress } from '../testing/nepal-locations.mock';
import { MemberAddressTabComponent } from './member-address-tab.component';

describe('MemberAddressTabComponent', () => {
  let fixture: ComponentFixture<MemberAddressTabComponent>;
  let component: MemberAddressTabComponent;
  let addressService: { getAddresses: jest.Mock; delete: jest.Mock };
  let dialog: { open: jest.Mock };
  let notifier: { notify: jest.Mock };
  let dialogResult: unknown;

  const create = async (addresses: MemberAddress[] | Error) => {
    addressService = {
      getAddresses: jest.fn(() => (addresses instanceof Error ? throwError(() => addresses) : of(addresses))),
      delete: jest.fn(() => of({}))
    };
    dialogResult = undefined;
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })) };
    notifier = { notify: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [
        MemberAddressTabComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ clientId: '16' }) } } }
        },
        { provide: MemberAddressService, useValue: addressService },
        { provide: ClientActionNotifierService, useValue: notifier },
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions: ['ALL_FUNCTIONS'] }) } }
      ]
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();
    TestBed.inject(FaIconLibrary).addIcons(
      faEdit,
      faExclamationTriangle,
      faHome,
      faLink,
      faLocationArrow,
      faPlus,
      faTrash
    );

    fixture = TestBed.createComponent(MemberAddressTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const element = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  it('asks for the permanent address when the member has none', async () => {
    await create([]);
    expect(addressService.getAddresses).toHaveBeenCalledWith('16');
    expect(element('missing-permanent')).not.toBeNull();
    expect(element('add-PERMANENT')).not.toBeNull();
    expect(element('add-TEMPORARY')).not.toBeNull();
  });

  it('shows both addresses and blocks removing the permanent one while the temporary one follows it', async () => {
    await create([
      mockAddress(),
      mockAddress({ id: 8, addressType: 'TEMPORARY', sameAsPermanent: true })
    ]);

    expect(element('missing-permanent')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Kathmandu Metropolitan City-16, Kathmandu, Bagmati Province');
    expect((element('remove-PERMANENT') as HTMLButtonElement).disabled).toBe(true);
    expect((element('remove-TEMPORARY') as HTMLButtonElement).disabled).toBe(false);

    component.remove(component.cards()[0]);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('opens the dialog with the member context and reloads after a save', async () => {
    const permanent = mockAddress();
    await create([permanent]);
    dialogResult = true;

    element('add-TEMPORARY')!.click();

    expect(dialog.open).toHaveBeenCalledWith(
      MemberAddressDialogComponent,
      expect.objectContaining({
        data: { clientId: '16', addressType: 'TEMPORARY', address: null, permanentAddress: permanent }
      })
    );
    expect(notifier.notify).toHaveBeenCalledWith('clients.memberAddress.messages.saved');
    expect(addressService.getAddresses).toHaveBeenCalledTimes(2);
  });

  it('does not reload when the dialog is cancelled', async () => {
    await create([mockAddress()]);
    element('edit-PERMANENT')!.click();
    expect(dialog.open).toHaveBeenCalled();
    expect(addressService.getAddresses).toHaveBeenCalledTimes(1);
  });

  it('removes an address after confirmation', async () => {
    await create([mockAddress()]);
    dialogResult = { delete: true };

    element('remove-PERMANENT')!.click();

    expect(addressService.delete).toHaveBeenCalledWith('16', 'PERMANENT');
    expect(notifier.notify).toHaveBeenCalledWith('clients.memberAddress.messages.removed');
    expect(addressService.getAddresses).toHaveBeenCalledTimes(2);
  });

  it('offers a retry when the addresses cannot be loaded', async () => {
    await create(new Error('offline'));
    expect(component.loadFailed()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('clients.memberAddress.errors.addressesUnavailable');
  });
});
