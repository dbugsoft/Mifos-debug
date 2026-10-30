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
import { MeetingsService } from './meetings.service';

describe('MeetingsService', () => {
  let service: MeetingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(MeetingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists meetings with the kind, committee and fiscal year filters', () => {
    service.meetings('COMMITTEE', 1, 2083).subscribe();
    const req = http.expectOne(
      (r) =>
        r.url === '/nepal/governance/meetings' &&
        r.params.get('kind') === 'COMMITTEE' &&
        r.params.get('committeeId') === '1' &&
        r.params.get('fiscalYear') === '2083'
    );
    req.flush([]);
  });

  it('records a meeting with the attendance list, when given', () => {
    service
      .create({
        kind: 'COMMITTEE',
        committeeId: 1,
        heldOn: '2026-10-10',
        place: 'Head office',
        agenda: null,
        membersPresent: null,
        attendanceNote: null
      })
      .subscribe();
    const req = http.expectOne('/nepal/governance/meetings');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.committeeId).toBe(1);
    req.flush({});
  });

  it('sends each command with the right query param and body', () => {
    service.approve(7, '2026-10-20').subscribe();
    let req = http.expectOne((r) => r.url === '/nepal/governance/meetings/7' && r.params.get('command') === 'approve');
    expect(req.request.body).toEqual({ approvedOn: '2026-10-20' });
    req.flush({});

    service.void(7, 'Entered by mistake').subscribe();
    req = http.expectOne((r) => r.url === '/nepal/governance/meetings/7' && r.params.get('command') === 'void');
    expect(req.request.body).toEqual({ reason: 'Entered by mistake' });
    req.flush({});
  });

  it('adds a decision without a body-wide numbering clash, number left out by default', () => {
    service
      .addDecision(7, { subject: 'Date of the AGM', wording: 'The AGM will be held on 2083-08-15.', number: null })
      .subscribe();
    const req = http.expectOne('/nepal/governance/meetings/7/decisions');
    expect(req.request.body).toEqual({
      subject: 'Date of the AGM',
      wording: 'The AGM will be held on 2083-08-15.',
      number: null
    });
    req.flush({});
  });

  it('searches decisions to cite, with every filter optional', () => {
    service.decisions('GENERAL_MEETING', undefined, 2083, 'AGM').subscribe();
    const req = http.expectOne(
      (r) =>
        r.url === '/nepal/governance/meetings/decisions' &&
        r.params.get('body') === 'GENERAL_MEETING' &&
        r.params.get('fiscalYear') === '2083' &&
        r.params.get('search') === 'AGM'
    );
    req.flush([]);
  });

  it('attaches the signed minutes as multipart form data', () => {
    const file = new File(['x'], 'minutes.pdf', { type: 'application/pdf' });
    service.addMinutes(7, file).subscribe();
    const req = http.expectOne('/nepal/governance/meetings/7/minutes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({});
  });

  it('sends a correction with its decisionId only when given', () => {
    const file = new File(['x'], 'correction.pdf', { type: 'application/pdf' });
    service.addCorrection(7, 'The date is 2083-08-16, not 08-15.', 21, file).subscribe();
    const req = http.expectOne('/nepal/governance/meetings/7/corrections');
    const body = req.request.body as FormData;
    expect(body.get('correction')).toBe('The date is 2083-08-16, not 08-15.');
    expect(body.get('decisionId')).toBe('21');
    expect((body.get('file') as File).name).toBe('correction.pdf');
    req.flush({});
  });
});
