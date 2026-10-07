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
import { ComplianceService } from './compliance.service';
import { isoDate } from './compliance.models';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(ComplianceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks the backend what the user may see, once, and remembers it', () => {
    let showMenu: boolean | undefined;
    service.loadAccess().subscribe((a) => (showMenu = a.showMenu));
    service.loadAccess().subscribe();
    http.expectOne('/nepal/aml/access').flush({ permissions: ['READ_AMLCOMPLIANCE'], showMenu: true, holders: [] });
    expect(showMenu).toBe(true);
    expect(service.can('READ_AMLCOMPLIANCE')).toBe(true);
    expect(service.can('FILE_GOAML')).toBe(false);
  });

  it('treats a refused or failed access call as no access', () => {
    service.loadAccess().subscribe();
    http.expectOne('/nepal/aml/access').flush('no', { status: 500, statusText: 'Server Error' });
    expect(service.access().showMenu).toBe(false);
    expect(service.can('READ_AMLCOMPLIANCE')).toBe(false);
  });

  it('asks again after a new sign-in', () => {
    service.loadAccess().subscribe();
    http.expectOne('/nepal/aml/access').flush({ permissions: ['READ_AMLSUMMARY'], showMenu: true });
    service.loadAccess(true).subscribe();
    http.expectOne('/nepal/aml/access').flush({ permissions: [], showMenu: false });
    expect(service.access().showMenu).toBe(false);
  });

  it('forgets the answer on reset', () => {
    service.loadAccess().subscribe();
    http.expectOne('/nepal/aml/access').flush({ permissions: ['READ_AMLSUMMARY'], showMenu: true });
    service.reset();
    expect(service.access().showMenu).toBe(false);
  });

  it('sends a threshold decision with its reason as a command', () => {
    service.decideTtr(5, 'exempt', 'Government office').subscribe();
    const req = http.expectOne((r) => r.url === '/nepal/aml/ttr/5' && r.params.get('command') === 'exempt');
    expect(req.request.body).toEqual({ reason: 'Government office' });
    req.flush({});
  });

  it('makes threshold reports from the chosen items', () => {
    service
      .makeTtrReports([
        1,
        2
      ])
      .subscribe();
    const req = http.expectOne('/nepal/aml/goaml/reports');
    expect(req.request.body).toEqual({ type: 'TTR', ttrItemIds: [
        1,
        2
      ] });
    req.flush([]);
  });
});

describe('isoDate', () => {
  it('reads both of the date shapes Fineract sends', () => {
    expect(
      isoDate([
        2026,
        10,
        7
      ])
    ).toBe('2026-10-07');
    expect(isoDate('2026-10-07')).toBe('2026-10-07');
    expect(isoDate('2026-10-07T18:02:34+05:45')).toBe('2026-10-07');
    expect(isoDate(null)).toBe('');
  });
});
