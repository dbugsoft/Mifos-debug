/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * The blacklist and the staff-to-member links elections rely on (fineract-dbug #144; docs/governance-elections.md).
 * Fineract leaves a field with no value out of its answers, so a field typed `| null` may be missing.
 */

export interface Listing {
  id: number;
  clientId: number;
  accountNo: string;
  name: string;
  listedOn: string;
  listedByBody: string | null;
  reason: string;
  removedOn: string | null;
  fileName: string | null;
  recordedBy: string;
  removedBy: string | null;
  voided: boolean;
  voidReason: string | null;
}

export interface Employee {
  staffId: number;
  staffName: string;
  officeName: string;
  active: boolean;
  clientId: number | null;
  accountNo: string | null;
  memberName: string | null;
  linkedBy: string | null;
  linkedOn: string | null;
}

export interface StandingApiErrorDetail {
  parameterName?: string;
  defaultUserMessage?: string;
}
