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
import { ElectionsService } from './elections.service';

describe('ElectionsService', () => {
  let service: ElectionsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(ElectionsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists elections', () => {
    service.elections().subscribe();
    const req = http.expectOne('/nepal/governance/elections');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('sets up an election with the given fields', () => {
    service
      .create({
        title: 'Board election 2083',
        electionOn: '2083-02-01',
        cutOffOn: '2083-01-15',
        minMembershipMonths: null,
        committeeIds: null,
        decisionId: 9,
        note: null
      })
      .subscribe();
    const req = http.expectOne('/nepal/governance/elections');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.cutOffOn).toBe('2083-01-15');
    req.flush({});
  });

  it('reads one election', () => {
    service.election(5).subscribe();
    const req = http.expectOne('/nepal/governance/elections/5');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('sends freezeRoll, publish, declare and cancel with the right command and body', () => {
    service.freezeRoll(5).subscribe();
    let req = http.expectOne(
      (r) => r.url === '/nepal/governance/elections/5' && r.params.get('command') === 'freezeRoll'
    );
    expect(req.request.body).toEqual({});
    req.flush({});

    service.publish(5).subscribe();
    req = http.expectOne((r) => r.url === '/nepal/governance/elections/5' && r.params.get('command') === 'publish');
    expect(req.request.body).toEqual({});
    req.flush({});

    service
      .declare(5, { meetingId: 3, termsStartOn: '2083-02-02', results: [{ nominationId: 11, elected: true }] })
      .subscribe();
    req = http.expectOne((r) => r.url === '/nepal/governance/elections/5' && r.params.get('command') === 'declare');
    expect(req.request.body.meetingId).toBe(3);
    expect(req.request.body.results).toEqual([{ nominationId: 11, elected: true }]);
    req.flush({});

    service.cancel(5, 'No candidates came forward').subscribe();
    req = http.expectOne((r) => r.url === '/nepal/governance/elections/5' && r.params.get('command') === 'cancel');
    expect(req.request.body).toEqual({ reason: 'No candidates came forward' });
    req.flush({});
  });

  it('reads the voter roll with the included flag and an optional search', () => {
    service.voters(5, true, 'Thapa').subscribe();
    const req = http.expectOne(
      (r) =>
        r.url === '/nepal/governance/elections/5/voters' &&
        r.params.get('included') === 'true' &&
        r.params.get('search') === 'Thapa'
    );
    req.flush([]);
  });

  it('adds a nomination', () => {
    service
      .addNomination(5, { clientId: 12, committeeId: 1, positionId: 2, proposedBy: null, nominatedOn: null })
      .subscribe();
    const req = http.expectOne('/nepal/governance/elections/5/nominations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.clientId).toBe(12);
    req.flush({});
  });

  it('withdraws a nomination with a reason', () => {
    service.withdrawNomination(11, 'Stood down').subscribe();
    const req = http.expectOne(
      (r) => r.url === '/nepal/governance/elections/nominations/11' && r.params.get('command') === 'withdraw'
    );
    expect(req.request.body).toEqual({ reason: 'Stood down' });
    req.flush({});
  });
});
