/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';

import { CoopAuthService } from './coop-auth.service';

describe('CoopAuthService', () => {
  let service: CoopAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoopAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
