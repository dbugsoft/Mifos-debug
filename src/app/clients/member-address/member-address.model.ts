/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Member addresses in Nepal's administrative hierarchy.
 *
 * These mirror the backend's `/v1/clients/{clientId}/nepal-addresses` and `/v1/nepal-locations` resources
 * (Fineract ADR-0014). They replace Fineract's generic client address for cooperative members.
 */

/** A member has at most one address of each type. */
export type MemberAddressType = 'PERMANENT' | 'TEMPORARY';

/** One local level from `GET /v1/nepal-locations`, with its district and province. */
export interface NepalLocation {
  id: number;
  /** Identifies the local level nationally, e.g. `32701`. */
  combinedCode: string;
  provinceCode: string;
  provinceNameEn: string;
  provinceNameNp: string;
  districtCode: string;
  districtNameEn: string;
  districtNameNp: string;
  /** Only unique within its district; use `combinedCode` to identify a local level. */
  localLevelCode: string;
  localLevelNameEn: string;
  localLevelNameNp: string;
  ecologicalBelt: string;
  totalWard: number;
  /** False once the local level has been merged or renamed. */
  isActive: boolean;
}

/** A saved address. For a temporary address that follows the permanent one, the location is the permanent one's. */
export interface MemberAddress {
  id: number;
  clientId: number;
  addressType: MemberAddressType;
  sameAsPermanent: boolean;
  provinceCode: string;
  provinceNameEn: string;
  provinceNameNp: string;
  districtCode: string;
  districtNameEn: string;
  districtNameNp: string;
  localLevelCode: string;
  localLevelNameEn: string;
  localLevelNameNp: string;
  localLevelActive: boolean;
  wardNo: number;
  tole: string | null;
  houseNumber: string | null;
  lastModifiedOn: string;
}

/** The parts of an address that the address summary shows; a saved address has them all. */
export type MemberAddressView = Pick<
  MemberAddress,
  | 'provinceNameEn'
  | 'provinceNameNp'
  | 'districtNameEn'
  | 'districtNameNp'
  | 'localLevelNameEn'
  | 'localLevelNameNp'
  | 'localLevelActive'
  | 'wardNo'
  | 'tole'
  | 'houseNumber'
>;

/** What the API accepts for an address. Province and district are implied by the local level. */
export interface MemberAddressRequest {
  sameAsPermanent?: boolean;
  localLevelCode?: string;
  wardNo?: number;
  tole?: string | null;
  houseNumber?: string | null;
}

export interface MemberAddressTypeOption {
  code: MemberAddressType;
  required: boolean;
  sameAsPermanentAllowed: boolean;
}

/** `GET /v1/clients/{clientId}/nepal-addresses/template` */
export interface MemberAddressTemplate {
  addressTypeOptions: MemberAddressTypeOption[];
  toleMaxLength: number;
  houseNumberMaxLength: number;
}

/** What to record as the temporary address while creating a member. */
export type TemporaryAddressChoice = 'NONE' | 'SAME' | 'DIFFERENT';

/** The addresses entered while creating a member, saved once the member exists. */
export interface MemberAddressDraft {
  permanent: MemberAddressRequest;
  /** `null` when no temporary address was given. */
  temporary: MemberAddressRequest | null;
}

/** Field limits, matching the `np_client_address` columns. The template endpoint returns the same values. */
export const MEMBER_ADDRESS_LIMITS = {
  toleMaxLength: 150,
  houseNumberMaxLength: 30
} as const;
