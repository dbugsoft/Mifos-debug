/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from '@jest/globals';

import { NepalLocationIndex, bilingualName } from './nepal-location-index';
import { MOCK_LOCATIONS, mockLocation } from './testing/nepal-locations.mock';

describe('NepalLocationIndex', () => {
  const index = new NepalLocationIndex(MOCK_LOCATIONS);

  it('lists provinces once each, in code order', () => {
    expect(index.provinces().map((p) => p.code)).toEqual([
      '1',
      '3'
    ]);
  });

  it('lists only the districts of the chosen province, by name', () => {
    expect(index.districts('3').map((d) => d.nameEn)).toEqual([
      'Bhaktapur',
      'Kathmandu'
    ]);
    expect(index.districts('1').map((d) => d.nameEn)).toEqual(['Taplejung']);
    expect(index.districts(null)).toEqual([]);
  });

  it('lists only the local levels of the chosen district, hiding merged ones', () => {
    expect(index.localLevels('3', '27').map((l) => l.code)).toEqual([
      '32702',
      '32701'
    ]);
    expect(index.localLevels('3', '28').map((l) => l.code)).toEqual(['32801']);
    expect(index.localLevels('3', null)).toEqual([]);
  });

  it('keeps a merged local level selectable when it is the saved one', () => {
    const options = index.localLevels('3', '27', '32799');
    expect(options.map((l) => l.code)).toContain('32799');
    expect(options.find((l) => l.code === '32799')?.active).toBe(false);
  });

  it('does not mix up districts that share a code across provinces', () => {
    const clash = new NepalLocationIndex([
      mockLocation({ combinedCode: 'A', provinceCode: '1', districtCode: '05' }),
      mockLocation({ combinedCode: 'B', provinceCode: '2', districtCode: '05' })
    ]);
    expect(clash.localLevels('1', '05').map((l) => l.code)).toEqual(['A']);
    expect(clash.localLevels('2', '05').map((l) => l.code)).toEqual(['B']);
  });

  it('offers wards 1 to the local level total', () => {
    expect(index.wards('32702')).toEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13
    ]);
    expect(index.wards('unknown')).toEqual([]);
    expect(index.wards(null)).toEqual([]);
  });

  it('hides a district or province whose local levels are all inactive', () => {
    const retired = new NepalLocationIndex([
      mockLocation({ combinedCode: 'X', provinceCode: '9', districtCode: '99', isActive: false })
    ]);
    expect(retired.provinces()).toEqual([]);
    expect(retired.provinces('9').map((p) => p.code)).toEqual(['9']);
    expect(retired.districts('9')).toEqual([]);
    expect(retired.districts('9', '99').map((d) => d.code)).toEqual(['99']);
  });

  it('reports an empty list', () => {
    expect(new NepalLocationIndex([]).isEmpty).toBe(true);
    expect(index.isEmpty).toBe(false);
  });
});

describe('bilingualName', () => {
  it('puts the chosen language first', () => {
    expect(bilingualName('Kathmandu', 'काठमाडौं', false)).toBe('Kathmandu (काठमाडौं)');
    expect(bilingualName('Kathmandu', 'काठमाडौं', true)).toBe('काठमाडौं (Kathmandu)');
  });

  it('falls back to whichever name exists', () => {
    expect(bilingualName('Kathmandu', null, true)).toBe('Kathmandu');
    expect(bilingualName(' ', 'काठमाडौं', false)).toBe('काठमाडौं');
    expect(bilingualName(undefined, undefined, false)).toBe('');
  });
});
