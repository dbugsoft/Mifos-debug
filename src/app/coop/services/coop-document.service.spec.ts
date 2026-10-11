/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';

import { CoopDocumentService } from './coop-document.service';

describe('CoopDocumentService', () => {
  let service: CoopDocumentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoopDocumentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
