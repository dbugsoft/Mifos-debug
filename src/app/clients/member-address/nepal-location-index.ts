/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { NepalLocation } from './member-address.model';

/** One entry in a province, district or local level dropdown. */
export interface LocationOption {
  code: string;
  nameEn: string;
  nameNp: string;
  /** False for a merged or renamed local level, or a district or province with no active local level left. */
  active: boolean;
}

const byEnglishName = (a: LocationOption, b: LocationOption) => a.nameEn.localeCompare(b.nameEn, 'en');

/**
 * The ~753 local levels from `/v1/nepal-locations`, grouped once so each dropdown can be filled without scanning the
 * whole list again.
 *
 * District codes are only looked up within their province, and local levels are identified by their combined code,
 * because a local level's own code repeats across districts.
 *
 * Inactive places are hidden from the lists, except the one an existing address already uses, so that address can
 * still be shown and saved unchanged.
 */
export class NepalLocationIndex {
  private readonly provinceList: LocationOption[];
  private readonly districtsByProvince = new Map<string, LocationOption[]>();
  private readonly localLevelsByDistrict = new Map<string, LocationOption[]>();
  private readonly byCombinedCode = new Map<string, NepalLocation>();

  constructor(locations: readonly NepalLocation[]) {
    const provinces = new Map<string, LocationOption>();
    const districts = new Map<string, Map<string, LocationOption>>();

    for (const location of locations) {
      this.byCombinedCode.set(location.combinedCode, location);

      const province = provinces.get(location.provinceCode) ?? {
        code: location.provinceCode,
        nameEn: location.provinceNameEn,
        nameNp: location.provinceNameNp,
        active: false
      };
      province.active ||= location.isActive;
      provinces.set(location.provinceCode, province);

      const provinceDistricts = districts.get(location.provinceCode) ?? new Map<string, LocationOption>();
      const district = provinceDistricts.get(location.districtCode) ?? {
        code: location.districtCode,
        nameEn: location.districtNameEn,
        nameNp: location.districtNameNp,
        active: false
      };
      district.active ||= location.isActive;
      provinceDistricts.set(location.districtCode, district);
      districts.set(location.provinceCode, provinceDistricts);

      const key = NepalLocationIndex.districtKey(location.provinceCode, location.districtCode);
      const localLevels = this.localLevelsByDistrict.get(key) ?? [];
      localLevels.push({
        code: location.combinedCode,
        nameEn: location.localLevelNameEn,
        nameNp: location.localLevelNameNp,
        active: location.isActive
      });
      this.localLevelsByDistrict.set(key, localLevels);
    }

    this.provinceList = [...provinces.values()].sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }));
    districts.forEach((provinceDistricts, provinceCode) =>
      this.districtsByProvince.set(provinceCode, [...provinceDistricts.values()].sort(byEnglishName))
    );
    this.localLevelsByDistrict.forEach((localLevels) => localLevels.sort(byEnglishName));
  }

  get isEmpty(): boolean {
    return this.byCombinedCode.size === 0;
  }

  /** @param keepCode a saved province to list even if it is no longer active */
  provinces(keepCode?: string | null): LocationOption[] {
    return NepalLocationIndex.selectable(this.provinceList, keepCode);
  }

  districts(provinceCode: string | null | undefined, keepCode?: string | null): LocationOption[] {
    return provinceCode
      ? NepalLocationIndex.selectable(this.districtsByProvince.get(provinceCode) ?? [], keepCode)
      : [];
  }

  localLevels(
    provinceCode: string | null | undefined,
    districtCode: string | null | undefined,
    keepCode?: string | null
  ): LocationOption[] {
    if (!provinceCode || !districtCode) {
      return [];
    }
    const key = NepalLocationIndex.districtKey(provinceCode, districtCode);
    return NepalLocationIndex.selectable(this.localLevelsByDistrict.get(key) ?? [], keepCode);
  }

  /** Ward numbers 1..n for a local level, or an empty list if it is unknown. */
  wards(combinedCode: string | null | undefined): number[] {
    const total = combinedCode ? (this.byCombinedCode.get(combinedCode)?.totalWard ?? 0) : 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  find(combinedCode: string | null | undefined): NepalLocation | undefined {
    return combinedCode ? this.byCombinedCode.get(combinedCode) : undefined;
  }

  private static selectable(options: LocationOption[], keepCode?: string | null): LocationOption[] {
    return options.filter((option) => option.active || option.code === keepCode);
  }

  private static districtKey(provinceCode: string, districtCode: string): string {
    return `${provinceCode}/${districtCode}`;
  }
}

/**
 * "Bagmati Province (बागमती प्रदेश)", or Nepali first when the app is in Nepali. This matches how code values such
 * as "Individual (व्यक्तिगत)" already appear across the member screens.
 */
export function bilingualName(
  nameEn: string | null | undefined,
  nameNp: string | null | undefined,
  nepaliFirst: boolean
) {
  const en = nameEn?.trim() ?? '';
  const np = nameNp?.trim() ?? '';
  if (!en || !np) {
    return en || np;
  }
  return nepaliFirst ? `${np} (${en})` : `${en} (${np})`;
}
