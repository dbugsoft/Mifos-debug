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
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Appraisal, AppraisalService } from './appraisal.service';

describe('AppraisalService', () => {
  let service: AppraisalService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(AppraisalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads a half-done appraisal with its left-out fields as null', () => {
    let a: Appraisal;
    service.get(81).subscribe((x) => (a = x));
    http.expectOne('/nepal/lending/appraisals/81').flush({
      loanId: 81,
      amount: 300000,
      required: true,
      editable: true,
      form: [{ code: 'CAPACITY', label: 'Capacity to pay', good: 5, ok: 3, weak: 1, lines: [{ code: 'CAPACITY_1' }] }],
      answers: { CAPACITY_1: 'GOOD' },
      result: { score: 5, areas: { CAPACITY: 5 }, unanswered: ['CAPACITY_2'], problems: [] },
      valuations: [{ id: 3, landValue: 900000, valuer: { id: 2, name: 'Hari' } }]
    });

    expect(a.form[0].lines[0].label).toBe('CAPACITY_1');
    expect(a.result.band).toBeNull();
    expect(a.result.maxLoan).toBeNull();
    expect(a.projectCost).toBeNull();
    expect(a.recommended).toBeNull();
    expect(a.hold).toBe(false);
    expect(a.valuations[0].houseValue).toBeNull();
    expect(a.valuations[0].valuer.name).toBe('Hari');
  });

  it('saves the answers, clearing a line with null, and removes a valuation with its reason', () => {
    service
      .save(81, { answers: { CAPACITY_1: 'OK', CAPACITY_2: null }, projectCost: 500000, purpose: null, opinion: null })
      .subscribe();
    const put = http.expectOne('/nepal/lending/appraisals/81');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.answers).toEqual({ CAPACITY_1: 'OK', CAPACITY_2: null });
    put.flush({ loanId: 81 });

    service.removeValuation(81, 3, 'Valued twice').subscribe();
    const remove = http.expectOne('/nepal/lending/appraisals/81/valuations/3/remove');
    expect(remove.request.method).toBe('POST');
    expect(remove.request.body).toEqual({ reason: 'Valued twice' });
    remove.flush({ loanId: 81 });
  });
});
