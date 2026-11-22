/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { COMPLIANCE_PLACES, placeOf } from './compliance-places';
import { CompliancePlace } from './compliance.models';
import { compliancePages } from 'app/core/shell/sidenav/nav-items';

describe('compliance places', () => {
  it('knows the place of every compliance page', () => {
    expect(placeOf('/compliance')).toBe('TODAY');
    expect(placeOf('/compliance?x=1')).toBe('TODAY');
    expect(placeOf('/compliance/threshold-reports')).toBe('REPORTS');
    expect(placeOf('/compliance/cases/12')).toBe('SUSPICIONS');
    expect(placeOf('/compliance/members/5')).toBe('MEMBERS');
    expect(placeOf('/compliance/screening/matches/3')).toBe('MEMBERS');
    expect(placeOf('/compliance/governance/elections/2')).toBe('DUTIES');
    expect(placeOf('/compliance/reports/SCHEDULE_3/2082')).toBe('DUTIES');
    expect(placeOf('/members/5')).toBeNull();
  });

  it('puts every tab in the place its URL belongs to', () => {
    for (const place of Object.keys(COMPLIANCE_PLACES) as CompliancePlace[]) {
      for (const tab of COMPLIANCE_PLACES[place].tabs) {
        expect(placeOf(tab.path.join('/').replace('//', '/'))).toBe(place);
      }
    }
  });

  it('gives the menu Today and one page per place, each counted and shown only by name', () => {
    expect(compliancePages.map((p) => p.compliancePlace)).toEqual([
      'TODAY',
      'REPORTS',
      'SUSPICIONS',
      'MEMBERS',
      'DUTIES'
    ]);
    expect(compliancePages.every((p) => Array.isArray(p.permission) && p.permission.length > 0)).toBe(true);
  });
});
