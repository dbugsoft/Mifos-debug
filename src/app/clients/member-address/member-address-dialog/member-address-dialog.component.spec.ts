/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { MemberAddressService } from '../member-address.service';
import { NepalLocationIndex } from '../nepal-location-index';
import { NepalLocationService } from '../nepal-location.service';
import { MOCK_LOCATIONS, mockAddress } from '../testing/nepal-locations.mock';
import { MemberAddressDialogComponent, MemberAddressDialogData } from './member-address-dialog.component';

describe('MemberAddressDialogComponent', () => {
  let fixture: ComponentFixture<MemberAddressDialogComponent>;
  let component: MemberAddressDialogComponent;
  let addressService: { create: jest.Mock; update: jest.Mock };
  let dialogRef: { close: jest.Mock; disableClose: boolean };
  let locations: jest.Mock;

  const create = async (data: MemberAddressDialogData) => {
    addressService = {
      create: jest.fn(() => of({ resourceId: 9 })),
      update: jest.fn(() => of({ resourceId: 7 }))
    };
    dialogRef = { close: jest.fn(), disableClose: false };
    locations = jest.fn(() => of(new NepalLocationIndex(MOCK_LOCATIONS)));

    await TestBed.configureTestingModule({
      imports: [
        MemberAddressDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MemberAddressService, useValue: addressService },
        { provide: NepalLocationService, useValue: { locations } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberAddressDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const fill = () => {
    const { provinceCode, districtCode, localLevelCode, wardNo, tole } = component.form.controls;
    provinceCode.setValue('3');
    districtCode.setValue('28');
    localLevelCode.setValue('32801');
    wardNo.setValue(4);
    tole.setValue('  Durbar Square  ');
  };

  it('creates a permanent address from the chosen places', async () => {
    await create({ clientId: 16, addressType: 'PERMANENT' });
    expect(dialogRef.disableClose).toBe(true);
    expect(component.canSave()).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid="same-as-permanent"]')).toBeNull();

    fill();
    expect(component.canSave()).toBe(true);
    component.save();

    expect(addressService.create).toHaveBeenCalledWith(16, 'PERMANENT', {
      sameAsPermanent: false,
      localLevelCode: '32801',
      wardNo: 4,
      tole: 'Durbar Square',
      houseNumber: null
    });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('replaces a saved address', async () => {
    await create({ clientId: 16, addressType: 'PERMANENT', address: mockAddress() });
    expect(component.canSave()).toBe(true);
    component.form.controls.houseNumber.setValue('12/4');
    component.save();

    expect(addressService.update).toHaveBeenCalledWith(
      16,
      'PERMANENT',
      expect.objectContaining({ houseNumber: '12/4' })
    );
  });

  it('lets a temporary address follow the permanent one, sending no location', async () => {
    const permanent = mockAddress();
    await create({ clientId: 16, addressType: 'TEMPORARY', permanentAddress: permanent });
    expect(component.sameAsPermanent.enabled).toBe(true);

    component.sameAsPermanent.setValue(true);
    fixture.detectChanges();
    expect(component.form.disabled).toBe(true);
    expect(component.canSave()).toBe(true);
    expect(fixture.nativeElement.querySelector('mifosx-member-address-summary')).not.toBeNull();

    component.save();
    expect(addressService.create).toHaveBeenCalledWith(16, 'TEMPORARY', { sameAsPermanent: true });
  });

  it('opens a following temporary address with the switch on, and can give it its own location', async () => {
    const permanent = mockAddress();
    await create({
      clientId: 16,
      addressType: 'TEMPORARY',
      permanentAddress: permanent,
      address: mockAddress({ id: 8, addressType: 'TEMPORARY', sameAsPermanent: true })
    });
    expect(component.sameAsPermanent.value).toBe(true);
    expect(component.savedLocalLevelCode).toBeNull();

    component.sameAsPermanent.setValue(false);
    fixture.detectChanges();
    expect(component.form.enabled).toBe(true);
    fill();
    component.save();
    expect(addressService.update).toHaveBeenCalledWith(
      16,
      'TEMPORARY',
      expect.objectContaining({ sameAsPermanent: false, localLevelCode: '32801' })
    );
  });

  it('keeps what was typed when "same as permanent" is switched on and off again', async () => {
    await create({ clientId: 16, addressType: 'TEMPORARY', permanentAddress: mockAddress() });
    fill();

    component.sameAsPermanent.setValue(true);
    fixture.detectChanges();
    component.sameAsPermanent.setValue(false);
    fixture.detectChanges();

    expect(component.form.getRawValue()).toEqual(
      expect.objectContaining({ provinceCode: '3', districtCode: '28', localLevelCode: '32801', wardNo: 4 })
    );
    expect(component.canSave()).toBe(true);
  });

  it('does not offer "same as permanent" before a permanent address exists', async () => {
    await create({ clientId: 16, addressType: 'TEMPORARY', permanentAddress: null });
    expect(component.sameAsPermanent.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('clients.memberAddress.hints.addPermanentFirst');
  });

  it('stays open, with the input kept, when saving fails', async () => {
    await create({ clientId: 16, addressType: 'PERMANENT' });
    addressService.create.mockReturnValue(throwError(() => new Error('400')));
    fill();
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
    expect(component.form.controls.localLevelCode.value).toBe('32801');
  });

  it('offers a retry when the place list cannot be loaded', async () => {
    await create({ clientId: 16, addressType: 'PERMANENT' });
    locations.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.loadLocations();
    expect(component.loadFailed()).toBe(true);

    component.loadLocations();
    expect(component.loadFailed()).toBe(false);
    expect(component.locations()).not.toBeNull();
  });
});
