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
import { RelatedPartiesService } from './related-parties.service';

describe('RelatedPartiesService', () => {
  let service: RelatedPartiesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(RelatedPartiesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the register of related parties', () => {
    service.register().subscribe();
    const req = http.expectOne('/nepal/governance/related-parties');
    expect(req.request.method).toBe('GET');
    req.flush({ asOf: '2026-10-27', officers: [], members: [], notLinked: [] });
  });

  it('reads the credit exposure report', () => {
    service.loans().subscribe();
    const req = http.expectOne('/nepal/governance/related-parties/loans');
    req.flush({ asOf: '2026-10-27', parties: [], directors: [], directorsOutstanding: 0, relatedOutstanding: 0 });
  });

  it('adds a link with the exact backend fields', () => {
    service
      .addLink(3, {
        clientId: 20,
        relationshipCode: 'SPOUSE',
        relationshipDetail: null,
        marriageEnded: false,
        note: null
      })
      .subscribe();
    const req = http.expectOne('/nepal/governance/related-parties/people/3/links');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      clientId: 20,
      relationshipCode: 'SPOUSE',
      relationshipDetail: null,
      marriageEnded: false,
      note: null
    });
    req.flush({});
  });

  it('removes a link as a command, with its reason', () => {
    service.removeLink(5, 'Entered by mistake').subscribe();
    const req = http.expectOne(
      (r) => r.url === '/nepal/governance/related-parties/links/5' && r.params.get('command') === 'remove'
    );
    expect(req.request.body).toEqual({ reason: 'Entered by mistake' });
    req.flush({});
  });

  it('sets which login a person signs in with', () => {
    service.setLogin(3, 12).subscribe();
    const req = http.expectOne('/nepal/governance/related-parties/people/3/login');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ userId: 12 });
    req.flush({});
  });

  it('clears a login by sending null', () => {
    service.setLogin(3, null).subscribe();
    const req = http.expectOne('/nepal/governance/related-parties/people/3/login');
    expect(req.request.body).toEqual({ userId: null });
    req.flush({});
  });
});
