/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { AuthenticationService } from '../core/authentication/authentication.service';
import { StaffLoginService, emailAvailableValidator } from './staff-login.service';

describe('StaffLoginService', () => {
  let permissions: string[];
  let service: StaffLoginService;

  beforeEach(() => {
    permissions = [];
    TestBed.configureTestingModule({
      providers: [
        StaffLoginService,
        { provide: HttpClient, useValue: {} },
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions }) } }
      ]
    });
    service = TestBed.inject(StaffLoginService);
  });

  it('follows the permission rules of the mifosxHasPermission directive', () => {
    expect(service.canRead()).toBe(false);
    permissions = ['ALL_FUNCTIONS_READ'];
    expect(service.canRead()).toBe(true);
    expect(service.canUnlock()).toBe(false);
    permissions = [
      'UNLOCK_NEPALUSERLOGIN',
      'UPDATE_USER'
    ];
    expect(service.canUnlock()).toBe(true);
    expect(service.canSendCode()).toBe(true);
    permissions = ['ALL_FUNCTIONS'];
    expect(service.canRead() && service.canUnlock() && service.canSendCode()).toBe(true);
  });

  describe('emailAvailableValidator', () => {
    const run = (control: FormControl, answer: Observable<{ available: boolean }>) => {
      jest.spyOn(service, 'isEmailAvailable').mockReturnValue(answer);
      let result: unknown = 'pending';
      (emailAvailableValidator(service, () => 7)(control) as Observable<unknown>).subscribe((r) => (result = r));
      tick(400);
      return result;
    };

    it('flags an address another staff member has verified', fakeAsync(() => {
      expect(run(new FormControl('sita@example.org'), of({ available: false }))).toEqual({ emailTaken: true });
      expect(service.isEmailAvailable).toHaveBeenCalledWith('sita@example.org', 7);
    }));

    it('accepts a free address, and never blocks when the check itself fails', fakeAsync(() => {
      expect(run(new FormControl('new@example.org'), of({ available: true }))).toBeNull();
      expect(
        run(
          new FormControl('new@example.org'),
          throwError(() => new Error('offline'))
        )
      ).toBeNull();
    }));
  });
});
