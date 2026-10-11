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
import { GovernanceService } from './governance.service';

describe('GovernanceService', () => {
  let governance: GovernanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    governance = TestBed.inject(GovernanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('generates, writes and approves a report by its type and year', () => {
    governance.generate('SCHEDULE_3', 2082).subscribe();
    http.expectOne('/nepal/aml/annual-reports/SCHEDULE_3/2082/generate').flush({});
    governance.edit('SCHEDULE_3', 2082, { r19: 'Trained staff' }, { r1: 'At Asar end' }).subscribe();
    const req = http.expectOne('/nepal/aml/annual-reports/SCHEDULE_3/2082');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ values: { r19: 'Trained staff' }, remarks: { r1: 'At Asar end' } });
    req.flush({});
    governance.approve('SCHEDULE_3', 2082).subscribe();
    http.expectOne('/nepal/aml/annual-reports/SCHEDULE_3/2082/approve').flush({});
  });

  it('sends a plan with its document as a form, and without one too', () => {
    const file = new File(['%PDF'], 'plan.pdf', { type: 'application/pdf' });
    governance.addPlan({ fiscalYear: '2083', summary: 'Train tellers' }, file).subscribe();
    let req = http.expectOne('/nepal/aml/governance/plans');
    let form = req.request.body as FormData;
    expect(form.get('fiscalYear')).toBe('2083');
    expect((form.get('file') as File).name).toBe('plan.pdf');
    req.flush({});
    governance.addPlan({ fiscalYear: '2083', summary: 'Train tellers' }, null).subscribe();
    req = http.expectOne('/nepal/aml/governance/plans');
    form = req.request.body as FormData;
    expect(form.has('file')).toBe(false);
    req.flush({});
  });

  it('records that FIU-Nepal was told of the officer', () => {
    governance.notified(4, 'FIU', '2026-10-09').subscribe();
    const req = http.expectOne('/nepal/aml/governance/officers/4/notified');
    expect(req.request.body).toEqual({ to: 'FIU', on: '2026-10-09' });
    req.flush({});
  });
});
