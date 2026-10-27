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
import { ManagementReportsService } from './management-reports.service';

describe('ManagementReportsService', () => {
  let service: ManagementReportsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(ManagementReportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists reports with the office, fiscal year and status filters', () => {
    service.reports(1, 2083, 'APPROVED').subscribe();
    const req = http.expectOne(
      (r) =>
        r.url === '/nepal/management-reports' &&
        r.params.get('officeId') === '1' &&
        r.params.get('fiscalYear') === '2083' &&
        r.params.get('status') === 'APPROVED'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it("asks for a fiscal year's period shortcuts", () => {
    service.periods(2083).subscribe();
    const req = http.expectOne(
      (r) => r.url === '/nepal/management-reports/periods' && r.params.get('fiscalYear') === '2083'
    );
    req.flush([]);
  });

  it('creates a draft with the exact backend fields', () => {
    service.create({ from: '2026-08-17', to: '2026-09-16', officeId: null, notes: null, replacesId: null }).subscribe();
    const req = http.expectOne('/nepal/management-reports');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      from: '2026-08-17',
      to: '2026-09-16',
      officeId: null,
      notes: null,
      replacesId: null
    });
    req.flush({});
  });

  it('fetches the sealed content as text, not re-parsed JSON', () => {
    service.content(3).subscribe((text) => expect(text).toBe('{"version":1}'));
    const req = http.expectOne('/nepal/management-reports/3/content');
    expect(req.request.responseType).toBe('text');
    req.flush('{"version":1}');
  });

  it('sends each command with the right query param and body', () => {
    service.regenerate(3).subscribe();
    let req = http.expectOne(
      (r) => r.url === '/nepal/management-reports/3' && r.params.get('command') === 'regenerate'
    );
    expect(req.request.body).toEqual({});
    req.flush({});

    service.submit(3).subscribe();
    req = http.expectOne((r) => r.url === '/nepal/management-reports/3' && r.params.get('command') === 'submit');
    req.flush({});

    service.approve(3, 41, 'Approved unanimously').subscribe();
    req = http.expectOne((r) => r.url === '/nepal/management-reports/3' && r.params.get('command') === 'approve');
    expect(req.request.body).toEqual({ decisionId: 41, note: 'Approved unanimously' });
    req.flush({});

    service.returnReport(3, 41, null).subscribe();
    req = http.expectOne((r) => r.url === '/nepal/management-reports/3' && r.params.get('command') === 'return');
    expect(req.request.body).toEqual({ decisionId: 41, note: null });
    req.flush({});

    service.discard(3, 'Entered by mistake').subscribe();
    req = http.expectOne((r) => r.url === '/nepal/management-reports/3' && r.params.get('command') === 'discard');
    expect(req.request.body).toEqual({ reason: 'Entered by mistake' });
    req.flush({});
  });

  it('changes only the notes', () => {
    service.updateNotes(3, 'असुली राम्रो भयो।').subscribe();
    const req = http.expectOne('/nepal/management-reports/3');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ notes: 'असुली राम्रो भयो।' });
    req.flush({});
  });
});
