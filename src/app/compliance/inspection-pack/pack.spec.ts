/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { placeOf } from '../compliance-places';
import { reportTypeFor } from '../cases/decide-dialog/decide-dialog.component';
import { fiscalYearLabel } from './inspection-pack.service';

describe('Deciding a case and the inspection pack (ADR-0065)', () => {
  it('names the report from what is suspected', () => {
    expect(reportTypeFor('MONEY_MOVED')).toBe('STR');
    expect(reportTypeFor('ATTEMPTED')).toBe('SAR');
    expect(reportTypeFor('CONDUCT')).toBe('SAR');
    expect(reportTypeFor(null)).toBeNull();
  });

  it('writes a fiscal year the way people do', () => {
    expect(fiscalYearLabel(2082)).toBe('2082/83');
    expect(fiscalYearLabel(2099)).toBe('2099/00');
  });

  it('puts the inspection pack in Our own duties', () => {
    expect(placeOf('/compliance/inspection-pack')).toBe('DUTIES');
  });
});
