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
import { ComplianceToday, ReportSteps, isoDate } from './compliance.models';

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

  it('asks once for Today when the menu and the page ask together, and shares the answer', () => {
    service.loadToday().subscribe();
    service.loadToday().subscribe();
    const answer: ComplianceToday = {
      today: '2026-11-22',
      names: true,
      places: {},
      late: { total: 0 },
      soon: { total: 0 },
      items: [],
      more: 0
    };
    http.expectOne('/nepal/aml/today').flush(answer);
    expect(service.todayAnswer()).toEqual(answer);
    service.loadToday(5000).subscribe();
    http.expectOne('/nepal/aml/today?limit=5000').flush({ ...answer, more: 0 });
  });

  it('keeps the last Today answer when the call fails', () => {
    service.loadToday().subscribe();
    http.expectOne('/nepal/aml/today').flush('no', { status: 500, statusText: 'Server Error' });
    expect(service.todayAnswer()).toBeNull();
  });

  it('asks for reports of several statuses and one type, a page at a time', () => {
    service.goamlReports({ status: 'DRAFT,READY,REJECTED', type: 'STR', limit: 50, offset: 0 }).subscribe();
    const req = http.expectOne((r) => r.url === '/nepal/aml/goaml/reports');
    expect(req.request.params.get('status')).toBe('DRAFT,READY,REJECTED');
    expect(req.request.params.get('type')).toBe('STR');
    expect(req.request.params.get('limit')).toBe('50');
    expect(req.request.params.get('clientId')).toBeNull();
    req.flush([]);
  });

  it('remembers where the reports stand, for the tabs, and forgets it on reset', () => {
    service.loadReportSteps().subscribe();
    const steps = {
      today: '2026-11-22',
      fiscalYear: 2083,
      fiscalYearFrom: '2026-07-17',
      types: {},
      foundLate: 0
    } as unknown as ReportSteps;
    http.expectOne('/nepal/aml/today/reports').flush(steps);
    expect(service.reportSteps()).toEqual(steps);
    service.reset();
    expect(service.reportSteps()).toBeNull();
  });

  it('downloads several ready threshold reports as one zip', () => {
    service
      .reportsPackage([
        3,
        4
      ])
      .subscribe();
    const req = http.expectOne('/nepal/aml/goaml/reports/package');
    expect(req.request.body).toEqual({ reportIds: [
        3,
        4
      ] });
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
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
