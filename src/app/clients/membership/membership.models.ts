/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Membership begins with a share purchase (fineract-dbug ADR 0023). Shapes of /nepal/memberships. */

export type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MembershipApplication {
  id: number;
  clientId: number;
  accountNo: string;
  name: string;
  mobileNo?: string;
  officeId: number;
  officeName: string;
  shareProductId: number;
  shareProductName: string;
  kitta: number;
  /** kitta × the share product's unit price */
  shareAmount: number;
  savingsProductId: number;
  submittedOn: string;
  status: MembershipStatus;
  decidedOn?: string;
  rejectionReason?: string;
  savingsAccountId?: number;
  shareAccountId?: number;
  note?: string;
  /** Only while PENDING */
  daysElapsed?: number;
  /** Only while PENDING; negative once overdue */
  daysRemaining?: number;
  overdue: boolean;
}

export interface MembershipSettings {
  shareFirstEnabled: boolean;
  savingsProductId?: number;
  shareProductId?: number;
  decisionDays: number;
}

export interface ShareProductOption {
  id: number;
  name: string;
  unitPrice: number;
  minimumShares?: number;
  maximumShares?: number;
  charges: { id: number; name: string; amount: number }[];
}

export interface MembershipTemplate {
  shareProducts: ShareProductOption[];
  savingsProducts: { id: number; name: string }[];
  settings: MembershipSettings;
}

export interface MembershipSettingsView {
  settings: MembershipSettings;
  activeMembersWithoutShares: number;
}

export interface MembersWithoutShares {
  count: number;
  members: { clientId: number; accountNo: string; name: string; officeName: string; activatedOn?: string }[];
}

export interface MembershipApplyRequest {
  /** The same object the Create Member stepper sends to POST /clients */
  client: any;
  kitta: number;
  shareProductId?: number;
  note?: string;
}

/** The days-left chip: green with time to spare, amber in the last week, red once overdue. */
export type DeadlineTone = 'ok' | 'soon' | 'overdue';

export function deadlineTone(application: MembershipApplication): DeadlineTone | null {
  if (application.status !== 'PENDING' || application.daysRemaining == null) {
    return null;
  }
  if (application.overdue) {
    return 'overdue';
  }
  return application.daysRemaining <= 7 ? 'soon' : 'ok';
}
