/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { issuingDistrictOption } from './membership-citizenship.component';

describe('issuingDistrictOption', () => {
  it('keeps the province with the district, because district codes repeat across provinces', () => {
    const taplejung = issuingDistrictOption('1', {
      code: '01',
      nameEn: 'Taplejung',
      nameNp: 'ताप्लेजुङ',
      active: true
    });
    const dolakha = issuingDistrictOption('3', { code: '01', nameEn: 'Dolakha', nameNp: 'दोलखा', active: true });
    expect(taplejung.code).toBe('101');
    expect(dolakha.code).toBe('301');
    expect(taplejung.code).not.toBe(dolakha.code);
    expect(dolakha.nameEn).toBe('Dolakha');
  });
});
