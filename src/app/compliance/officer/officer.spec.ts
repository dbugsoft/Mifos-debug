/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TodayItem } from '../compliance.models';
import { whatToDo } from '../compliance-home/compliance-home.component';
import { loginProblems } from './officer-panel.component';

describe('The compliance officer (ADR-0064)', () => {
  it('says first that there is no login to check', () => {
    expect(loginProblems({ missing: ['FILE_GOAML'] })).toEqual(['compliance.officer.noLogin']);
  });

  it('says a login is off before what it lacks', () => {
    expect(loginProblems({ userId: 4, loginEnabled: false, missing: ['FILE_GOAML'] })).toEqual([
      'compliance.officer.loginOff',
      'compliance.officer.loginLacks'
    ]);
  });

  it('finds nothing wrong with a login that can do the job', () => {
    expect(loginProblems({ userId: 4, loginEnabled: true, missing: [] })).toEqual([]);
    expect(loginProblems(undefined)).toEqual([]);
  });

  it('words a handover deadline the way Today does', () => {
    const item = { kind: 'CASE', action: 'DECIDE', reference: 'CASE-2083-0007', count: null } as unknown as TodayItem;
    expect(whatToDo(item)).toEqual({
      key: 'compliance.today.do.CASE',
      params: { count: null, reference: 'CASE-2083-0007' }
    });
  });
});
