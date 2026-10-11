/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { agingParams } from './loan-aging.component';

describe('agingParams', () => {
  it('asks for one office when one is chosen', () => {
    expect(agingParams('PRODUCT', 3).toString()).toBe('groupBy=PRODUCT&officeId=3');
  });

  it('leaves the office out for the whole cooperative', () => {
    expect(agingParams('BRANCH', null).toString()).toBe('groupBy=BRANCH');
  });
});
