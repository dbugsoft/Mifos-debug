/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MemberAddress, NepalLocation } from '../member-address.model';

/** A small slice of `/v1/nepal-locations`, shaped like the real data, for tests. */
export function mockLocation(overrides: Partial<NepalLocation>): NepalLocation {
  return {
    id: 1,
    combinedCode: '32701',
    provinceCode: '3',
    provinceNameEn: 'Bagmati Province',
    provinceNameNp: 'बागमती प्रदेश',
    districtCode: '27',
    districtNameEn: 'Kathmandu',
    districtNameNp: 'काठमाडौं',
    localLevelCode: '01',
    localLevelNameEn: 'Kathmandu Metropolitan City',
    localLevelNameNp: 'काठमाडौं महानगरपालिका',
    ecologicalBelt: 'Hill',
    totalWard: 32,
    isActive: true,
    ...overrides
  };
}

export const MOCK_LOCATIONS: NepalLocation[] = [
  mockLocation({ id: 1 }),
  mockLocation({
    id: 2,
    combinedCode: '32702',
    localLevelCode: '02',
    localLevelNameEn: 'Budhanilkantha Municipality',
    localLevelNameNp: 'बुढानीलकण्ठ नगरपालिका',
    totalWard: 13
  }),
  mockLocation({
    id: 3,
    combinedCode: '32799',
    localLevelCode: '99',
    localLevelNameEn: 'Old Merged Municipality',
    localLevelNameNp: 'पुरानो गाभिएको नगरपालिका',
    totalWard: 5,
    isActive: false
  }),
  mockLocation({
    id: 4,
    combinedCode: '32801',
    districtCode: '28',
    districtNameEn: 'Bhaktapur',
    districtNameNp: 'भक्तपुर',
    localLevelCode: '01',
    localLevelNameEn: 'Bhaktapur Municipality',
    localLevelNameNp: 'भक्तपुर नगरपालिका',
    totalWard: 10
  }),
  mockLocation({
    id: 5,
    combinedCode: '10101',
    provinceCode: '1',
    provinceNameEn: 'Koshi Province',
    provinceNameNp: 'कोशी प्रदेश',
    districtCode: '01',
    districtNameEn: 'Taplejung',
    districtNameNp: 'ताप्लेजुङ',
    localLevelCode: '01',
    localLevelNameEn: 'Phungling Municipality',
    localLevelNameNp: 'फुङलिङ नगरपालिका',
    totalWard: 11
  })
];

export function mockAddress(overrides: Partial<MemberAddress> = {}): MemberAddress {
  return {
    id: 7,
    clientId: 16,
    addressType: 'PERMANENT',
    sameAsPermanent: false,
    provinceCode: '3',
    provinceNameEn: 'Bagmati Province',
    provinceNameNp: 'बागमती प्रदेश',
    districtCode: '27',
    districtNameEn: 'Kathmandu',
    districtNameNp: 'काठमाडौं',
    localLevelCode: '32701',
    localLevelNameEn: 'Kathmandu Metropolitan City',
    localLevelNameNp: 'काठमाडौं महानगरपालिका',
    localLevelActive: true,
    wardNo: 16,
    tole: 'Naxal',
    houseNumber: null,
    lastModifiedOn: '2026-09-17T06:00:00Z',
    ...overrides
  };
}
