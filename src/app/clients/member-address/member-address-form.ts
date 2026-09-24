/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';

import { MEMBER_ADDRESS_LIMITS, MemberAddress, MemberAddressRequest, MemberAddressView } from './member-address.model';
import { NepalLocationIndex } from './nepal-location-index';

/** The fields of one address. Province and district drive the dropdowns; only the local level is sent. */
export type MemberAddressForm = FormGroup<{
  provinceCode: FormControl<string | null>;
  districtCode: FormControl<string | null>;
  localLevelCode: FormControl<string | null>;
  wardNo: FormControl<number | null>;
  tole: FormControl<string | null>;
  houseNumber: FormControl<string | null>;
}>;

export function createMemberAddressForm(): MemberAddressForm {
  return new FormGroup({
    provinceCode: new FormControl<string | null>(null, Validators.required),
    districtCode: new FormControl<string | null>(null, Validators.required),
    localLevelCode: new FormControl<string | null>(null, Validators.required),
    wardNo: new FormControl<number | null>(null, Validators.required),
    tole: new FormControl<string | null>(null, Validators.maxLength(MEMBER_ADDRESS_LIMITS.toleMaxLength)),
    houseNumber: new FormControl<string | null>(null, Validators.maxLength(MEMBER_ADDRESS_LIMITS.houseNumberMaxLength))
  });
}

/** Fills the form from a saved address without triggering the dropdown resets. */
export function patchMemberAddressForm(form: MemberAddressForm, address: MemberAddress): void {
  form.setValue(
    {
      provinceCode: address.provinceCode,
      districtCode: address.districtCode,
      localLevelCode: address.localLevelCode,
      wardNo: address.wardNo,
      tole: address.tole ?? null,
      houseNumber: address.houseNumber ?? null
    },
    { emitEvent: false }
  );
}

export function toMemberAddressRequest(form: MemberAddressForm): MemberAddressRequest {
  const value = form.getRawValue();
  return {
    localLevelCode: value.localLevelCode ?? undefined,
    wardNo: value.wardNo ?? undefined,
    tole: blankToNull(value.tole),
    houseNumber: blankToNull(value.houseNumber)
  };
}

/** How an address that is not saved yet will read, for previews. `null` until a local level and ward are chosen. */
export function previewMemberAddress(form: MemberAddressForm, locations: NepalLocationIndex): MemberAddressView | null {
  const request = toMemberAddressRequest(form);
  const location = locations.find(request.localLevelCode);
  if (!location || !request.wardNo) {
    return null;
  }
  return {
    provinceNameEn: location.provinceNameEn,
    provinceNameNp: location.provinceNameNp,
    districtNameEn: location.districtNameEn,
    districtNameNp: location.districtNameNp,
    localLevelNameEn: location.localLevelNameEn,
    localLevelNameNp: location.localLevelNameNp,
    localLevelActive: location.isActive,
    wardNo: request.wardNo,
    tole: request.tole ?? null,
    houseNumber: request.houseNumber ?? null
  };
}

function blankToNull(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
