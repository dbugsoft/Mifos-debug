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
import { GovernanceRegisterService } from './governance-register.service';

describe('GovernanceRegisterService', () => {
  let service: GovernanceRegisterService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(GovernanceRegisterService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("creates a position of the cooperative's own", () => {
    service.createPosition({ name: 'Adviser', singleHolder: false, memberRequired: true }).subscribe();
    const req = http.expectOne('/nepal/governance/positions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Adviser', singleHolder: false, memberRequired: true });
    req.flush({
      id: 9,
      code: 'OWN_9',
      name: 'Adviser',
      singleHolder: false,
      memberRequired: true,
      builtIn: false,
      active: true
    });
  });

  it('changes only what a position allows after creation', () => {
    service.updatePosition(9, { name: 'Senior adviser', active: false }).subscribe();
    const req = http.expectOne('/nepal/governance/positions/9');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Senior adviser', active: false });
    req.flush({
      id: 9,
      code: 'OWN_9',
      name: 'Senior adviser',
      singleHolder: false,
      memberRequired: true,
      builtIn: false,
      active: false
    });
  });
});
