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
import { FIX_TAB, KYM_DOCUMENTS } from './kym.models';

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

  it("an organisation is fixed on Fineract's Edit screen, its address, its documents or its people", () => {
    expect(FIX_TAB['registrationNo']).toBe('edit');
    expect(FIX_TAB['headOffice']).toBe('address');
    expect(FIX_TAB['boardDecision']).toBe('documents');
    expect(FIX_TAB['chiefExecutive']).toBe('people');
    expect(FIX_TAB['mainObjective']).toBeUndefined();
    // every document the KYM looks for can be uploaded from the tab under a name the server matches
    for (const item of Object.keys(KYM_DOCUMENTS)) {
      expect(FIX_TAB[item]).toBe('documents');
    }
    expect(KYM_DOCUMENTS['byeLaws']).toEqual([
      'bye-laws',
      'authorised-letter'
    ]);
  });

  it('lists a page of one office, and leaves the office out for all of them', () => {
    service.list('BLOCKED', 7, 100, 100).subscribe();
    let req = http.expectOne((r) => r.url === '/nepal/kym');
    expect(req.request.params.get('status')).toBe('BLOCKED');
    expect(req.request.params.get('officeId')).toBe('7');
    expect(req.request.params.get('offset')).toBe('100');
    req.flush([]);
    service.list('INCOMPLETE', null, 0, 100).subscribe();
    req = http.expectOne((r) => r.url === '/nepal/kym');
    expect(req.request.params.has('officeId')).toBe(false);
    req.flush([]);
  });

  it('keeps the last KYM it saw, so the header chip follows changes on the tab', () => {
    service.get(5).subscribe();
    http.expectOne('/nepal/kym/5').flush({ clientId: 5, status: 'INCOMPLETE' });
    expect(service.latest()?.status).toBe('INCOMPLETE');
    service.updateOrganisation(5, { orgType: 'GROUP' }).subscribe();
    const req = http.expectOne('/nepal/kym/5/organisation');
    expect(req.request.body).toEqual({ orgType: 'GROUP', inPerson: true });
    req.flush({ clientId: 5, status: 'COMPLETE' });
    expect(service.latest()?.status).toBe('COMPLETE');
  });

  it("links and ends an organisation's people", () => {
    service.linkPerson(5, 8, 'BOARD_MEMBER', '').subscribe();
    let req = http.expectOne('/nepal/kym/5/people');
    expect(req.request.body).toEqual({ personClientId: 8, role: 'BOARD_MEMBER', title: null });
    req.flush({ clientId: 5 });
    service.endPerson(5, 3, 'Resigned').subscribe();
    req = http.expectOne('/nepal/kym/5/people/3/end');
    expect(req.request.body).toEqual({ reason: 'Resigned' });
    req.flush({ clientId: 5 });
  });

  it('uploads a document under its fixed name', () => {
    service.uploadDocument(5, 'board-decision', new File(['x'], 'scan.pdf')).subscribe();
    const req = http.expectOne('/clients/5/documents');
    const body = req.request.body as FormData;
    expect(body.get('name')).toBe('board-decision');
    expect((body.get('file') as File).name).toBe('scan.pdf');
    req.flush({});
  });
});
