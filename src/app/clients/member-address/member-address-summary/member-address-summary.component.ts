/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { injectNepaliFirst } from '../nepali-first';
import { MemberAddressView } from '../member-address.model';

/**
 * An address written the way it is written in Nepal, smallest place first:
 * "Naxal, House 12/4 · Kathmandu Metropolitan City-16, Kathmandu, Bagmati Province".
 * The line in the other language is shown underneath, so staff can read it back to the member either way.
 */
@Component({
  selector: 'mifosx-member-address-summary',
  templateUrl: './member-address-summary.component.html',
  styleUrls: ['./member-address-summary.component.scss'],
  imports: [...STANDALONE_SHARED_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberAddressSummaryComponent {
  readonly address = input.required<MemberAddressView>();

  readonly nepaliFirst = injectNepaliFirst();

  readonly street = computed(() => {
    const { tole, houseNumber } = this.address();
    return { tole: tole?.trim() || null, houseNumber: houseNumber?.trim() || null };
  });
  readonly english = computed(() => placeLine(this.address(), 'En'));
  readonly nepali = computed(() => placeLine(this.address(), 'Np'));
  readonly primary = computed(() => (this.nepaliFirst() && this.nepali() ? this.nepali() : this.english()));
  readonly secondary = computed(() => {
    const other = this.nepaliFirst() ? this.english() : this.nepali();
    return other && other !== this.primary() ? other : null;
  });
}

function placeLine(address: MemberAddressView, language: 'En' | 'Np'): string {
  // The reference data carries stray spaces in some names (e.g. "काठमाडौँ "), which would show before the commas.
  const localLevel = address[`localLevelName${language}`]?.trim();
  const district = address[`districtName${language}`]?.trim();
  const province = address[`provinceName${language}`]?.trim();
  if (!localLevel || !district || !province) {
    return '';
  }
  const ward = address.wardNo ? `-${language === 'Np' ? toNepaliDigits(address.wardNo) : address.wardNo}` : '';
  return `${localLevel}${ward}, ${district}, ${province}`;
}

const NEPALI_DIGITS = '०१२३४५६७८९';

function toNepaliDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => NEPALI_DIGITS[Number(digit)]);
}
