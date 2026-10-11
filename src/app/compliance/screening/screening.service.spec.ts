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
import { ScreeningService } from './screening.service';

describe('ScreeningService', () => {
  let screening: ScreeningService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    screening = TestBed.inject(ScreeningService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a list file with its source as a form', () => {
    const file = new File(['Reference'], 'moha.csv', { type: 'text/csv' });
    screening.upload('HOME_MINISTRY', file).subscribe();
    const req = http.expectOne('/nepal/aml/screening/lists');
    expect(req.request.method).toBe('POST');
    const form = req.request.body as FormData;
    expect(form.get('source')).toBe('HOME_MINISTRY');
    expect((form.get('file') as File).name).toBe('moha.csv');
    req.flush({ listId: 1, unchanged: false });
  });

  it('asks for the matches of one status', () => {
    screening.hits('NOT_A_MATCH').subscribe();
    const req = http.expectOne((r) => r.url === '/nepal/aml/screening/hits');
    expect(req.request.params.get('status')).toBe('NOT_A_MATCH');
    req.flush([]);
  });

  it('decides one match, or several of one entry, with the reason', () => {
    screening.decide(4, 'CONFIRMED', 'Same father and district').subscribe();
    let req = http.expectOne('/nepal/aml/screening/hits/4/decide');
    expect(req.request.body).toEqual({ decision: 'CONFIRMED', reason: 'Same father and district' });
    req.flush({});
    screening
      .notAMatchAll(
        [
          1,
          2
        ],
        'Family of a long-standing member'
      )
      .subscribe();
    req = http.expectOne('/nepal/aml/screening/hits/not-a-match');
    expect(req.request.body).toEqual({ hitIds: [
        1,
        2
      ], reason: 'Family of a long-standing member' });
    req.flush({ decided: 2 });
  });

  it('releases a freeze with the reason', () => {
    screening.release(9, 'Removed from the list').subscribe();
    const req = http.expectOne('/nepal/aml/screening/freezes/9/release');
    expect(req.request.body).toEqual({ reason: 'Removed from the list' });
    req.flush({});
  });
});
