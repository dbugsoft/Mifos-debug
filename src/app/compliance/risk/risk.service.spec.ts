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
import { RiskService } from './risk.service';
import { PepService } from '../pep/pep.service';

describe('RiskService and PepService', () => {
  let risk: RiskService;
  let peps: PepService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    risk = TestBed.inject(RiskService);
    peps = TestBed.inject(PepService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists a grade, or the overdue reviews without a grade', () => {
    risk.list('HIGH', false).subscribe();
    let req = http.expectOne((r) => r.url === '/nepal/aml/risk');
    expect(req.request.params.get('grade')).toBe('HIGH');
    expect(req.request.params.has('reviewDue')).toBe(false);
    req.flush([]);
    risk.list(null, true).subscribe();
    req = http.expectOne((r) => r.url === '/nepal/aml/risk');
    expect(req.request.params.has('grade')).toBe(false);
    expect(req.request.params.get('reviewDue')).toBe('true');
    req.flush([]);
  });

  it('removing an override sends a null grade', () => {
    risk.override(5, null, 'Back').subscribe();
    const req = http.expectOne('/nepal/aml/risk/member/5/override');
    expect(req.request.body).toEqual({ grade: null, reason: 'Back' });
    req.flush({});
  });

  it('staff ask only the yes/no, never the grade', () => {
    risk.extraChecks(7).subscribe();
    http.expectOne('/nepal/aml/member-flags/7').flush({ clientId: 7, extraChecks: false });
  });

  it('enhanced checks are reviewed and ended by their id', () => {
    risk.reviewEdd(3, { findings: 'Seen', decision: 'CONTINUE' }).subscribe();
    http.expectOne('/nepal/aml/edd/3/review').flush([]);
    risk.closeEdd(3, 'Done').subscribe();
    const req = http.expectOne('/nepal/aml/edd/3/close');
    expect(req.request.body).toEqual({ finding: 'Done' });
    req.flush([]);
  });

  it('a suggestion key is sent safely in the address', () => {
    peps.dismiss('kym:5:1a2b', 'A volunteer').subscribe();
    http.expectOne('/nepal/aml/peps/suggestions/kym%3A5%3A1a2b/dismiss').flush({});
  });

  it('clearing an occupation or an area sends a null grade', () => {
    peps.setOccupation(9, null, false).subscribe();
    let req = http.expectOne('/nepal/aml/occupations/9');
    expect(req.request.body).toEqual({ grade: null, pepOccupation: false, note: null });
    req.flush([]);
    peps.setArea('DISTRICT', '306', null).subscribe();
    req = http.expectOne('/nepal/aml/areas');
    expect(req.request.body).toEqual({ level: 'DISTRICT', code: '306', grade: null, note: null });
    req.flush([]);
  });
});
