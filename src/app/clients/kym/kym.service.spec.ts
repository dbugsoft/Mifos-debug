/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { KymService } from './kym.service';
import { FIX_TAB } from './kym.models';

describe('KymService', () => {
  let permissions: string[];
  let service: KymService;
  let http: HttpTestingController;

  beforeEach(() => {
    permissions = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions }) } }
      ]
    });
    service = TestBed.inject(KymService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows the tab only to those who may read the KYM, as Fineract decides it', () => {
    expect(service.canRead()).toBe(false);
    permissions.push('READ_CLIENT');
    expect(service.canRead()).toBe(false);
    permissions.push('ALL_FUNCTIONS_READ');
    expect(service.canRead()).toBe(true);
    expect(service.canUpdate()).toBe(false);
  });

  it('changing and verifying need their own permissions; everything is allowed with ALL_FUNCTIONS', () => {
    permissions.push('READ_KYM', 'UPDATE_KYM');
    expect(service.canUpdate()).toBe(true);
    expect(service.canVerify()).toBe(false);
    permissions.splice(0, permissions.length, 'ALL_FUNCTIONS');
    expect(service.canRead() && service.canUpdate() && service.canVerify()).toBe(true);
  });

  it('a beneficial owner is always added with the member present', () => {
    service.addOwner(5, { ownerName: 'Hari', control: 'FUNDS' }).subscribe();
    const req = http.expectOne('/nepal/kym/5/beneficial-owners');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ inPerson: true, ownerName: 'Hari', control: 'FUNDS' });
    req.flush({});
  });

  it('finds the occupations in the PROFESSION code, and asks once', () => {
    let first: unknown;
    let second: unknown;
    service.professions().subscribe((p) => (first = p));
    http.expectOne('/codes').flush([
      { id: 3, name: 'Gender' },
      { id: 9, name: 'PROFESSION' }
    ]);
    http.expectOne('/codes/9/codevalues').flush([{ id: 41, name: 'Farmer' }]);
    service.professions().subscribe((p) => (second = p));
    expect(first).toEqual([{ id: 41, name: 'Farmer' }]);
    expect(second).toEqual(first);
  });

  it('sends what Fineract keeps to its own tab, and the rest to the form', () => {
    expect(FIX_TAB['mother']).toBe('family-members');
    expect(FIX_TAB['citizenshipCopy']).toBe('identities');
    expect(FIX_TAB['thumbprint']).toBe('documents');
    expect(FIX_TAB['purposeOfJoining']).toBeUndefined();
  });
});
