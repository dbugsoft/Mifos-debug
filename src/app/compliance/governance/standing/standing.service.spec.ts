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
import { StandingService } from './standing.service';

describe('StandingService', () => {
  let service: StandingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(StandingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the whole blacklist when no clientId is given', () => {
    service.blacklist().subscribe();
    const req = http.expectOne((r) => r.url === '/nepal/governance/standing/blacklist' && !r.params.has('clientId'));
    req.flush([]);
  });

  it("lists one member's blacklist entries", () => {
    service.blacklist(12).subscribe();
    const req = http.expectOne(
      (r) => r.url === '/nepal/governance/standing/blacklist' && r.params.get('clientId') === '12'
    );
    req.flush([]);
  });

  it('adds a listing as multipart form data, the file only when given', () => {
    const file = new File(['x'], 'notice.pdf', { type: 'application/pdf' });
    service
      .addListing({ clientId: '12', listedOn: '2083-01-10', reason: 'Defaulted on a loan', listedByBody: '' }, file)
      .subscribe();
    const req = http.expectOne('/nepal/governance/standing/blacklist');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('clientId')).toBe('12');
    expect(body.get('reason')).toBe('Defaulted on a loan');
    expect(body.has('listedByBody')).toBe(false);
    expect((body.get('file') as File).name).toBe('notice.pdf');
    req.flush({});
  });

  it('removes and voids a listing with the right command and body', () => {
    service.removeListing(7, '2083-06-01').subscribe();
    let req = http.expectOne(
      (r) => r.url === '/nepal/governance/standing/blacklist/7' && r.params.get('command') === 'remove'
    );
    expect(req.request.body).toEqual({ removedOn: '2083-06-01' });
    req.flush({});

    service.voidListing(7, 'Entered by mistake').subscribe();
    req = http.expectOne(
      (r) => r.url === '/nepal/governance/standing/blacklist/7' && r.params.get('command') === 'void'
    );
    expect(req.request.body).toEqual({ reason: 'Entered by mistake' });
    req.flush({});
  });

  it('lists employees and links/unlinks one to a member', () => {
    service.employees().subscribe();
    let req = http.expectOne('/nepal/governance/standing/employees');
    req.flush([]);

    service.linkEmployee(3, 12).subscribe();
    req = http.expectOne('/nepal/governance/standing/employees/3');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ clientId: 12 });
    req.flush({});

    service.linkEmployee(3, null).subscribe();
    req = http.expectOne('/nepal/governance/standing/employees/3');
    expect(req.request.body).toEqual({ clientId: null });
    req.flush({});
  });
});
