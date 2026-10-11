/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Membership begins with a share purchase (fineract-dbug ADR 0023), with the rules each cooperative chooses (ADR 0035).
 * Shapes of /nepal/memberships.
 */

export type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** When the money for the shares and charges is taken. */
export type PaymentTaken = 'AT_APPROVAL' | 'AT_APPLICATION';

export interface ChargeOption {
  id: number;
  name: string;
  amount: number;
}

export interface Nominee {
  name: string;
  relationship: string;
  mobileNo?: string;
}

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
  /** The share product's charges, taken with the shares */
  charges: ChargeOption[];
  /** shareAmount plus the charges */
  amountDue: number;
  savingsProductId: number;
  /** The application date (the original date, for an existing application) */
  submittedOn: string;
  submittedById?: number;
  submittedBy?: string;
  /** When it was keyed in */
  enteredOn?: string;
  /** An existing application entered afterwards with its original date */
  enteredLate: boolean;
  status: MembershipStatus;
  decidedOn?: string;
  decidedBy?: string;
  rejectionReason?: string;
  approvalNote?: string;
  savingsAccountId?: number;
  shareAccountId?: number;
  note?: string;
  /** The money was taken when the application was entered */
  paidAtApplication: boolean;
  amountReceived?: number;
  paidOn?: string;
  receiptNumber?: string;
  refundAmount?: number;
  refundReceiptNumber?: string;
  citizenshipNumber?: string;
  citizenshipDistrictCode?: string;
  citizenshipDistrictName?: string;
  nominee?: Nominee;
  /** Only while PENDING */
  daysElapsed?: number;
  /** Only while PENDING and when the cooperative has a decision deadline; negative once overdue */
  daysRemaining?: number;
  overdue: boolean;
  /** An organisation applying (legal form Entity): no citizenship, no nominee */
  organisation?: boolean;
  /** Only while PENDING: how many items the applicant's KYM still lacks */
  kymMissing?: number;
}

export interface MembershipSettings {
  shareFirstEnabled: boolean;
  savingsProductId?: number;
  shareProductId?: number;
  /** null when there is no decision deadline */
  decisionDays: number | null;
  /** The person who entered an application cannot approve or refuse it */
  separateApprover: boolean;
  paymentTaken: PaymentTaken;
  nomineeRequired: boolean;
  /** Approval waits for a complete KYM (on by default, fineract-dbug ADR 0042) */
  kymRequiredForApproval?: boolean;
}

export interface ShareProductOption {
  id: number;
  name: string;
  unitPrice: number;
  minimumShares?: number;
  maximumShares?: number;
  charges: ChargeOption[];
  /** False when share money and fees will not reach the books */
  hasAccounting: boolean;
}

export interface MembershipTemplate {
  shareProducts: ShareProductOption[];
  savingsProducts: { id: number; name: string }[];
  settings: MembershipSettings;
}

export interface MembershipSettingsView {
  settings: MembershipSettings;
  activeMembersWithoutShares: number;
  /** Whether the chosen share product has accounting; null when none is chosen */
  shareProductHasAccounting: boolean | null;
}

export interface MembersWithoutShares {
  count: number;
  members: { clientId: number; accountNo: string; name: string; officeName: string; activatedOn?: string }[];
}

export interface MembershipApplyRequest {
  /** A new person: the same object the Create Member stepper sends to POST /clients */
  client?: any;
  /** A person already entered: refused (applying again), or pending (an existing application) */
  clientId?: number;
  kitta: number;
  shareProductId?: number;
  note?: string;
  citizenshipNumber?: string;
  citizenshipDistrictCode?: string;
  nominee?: Nominee;
  /** Only when the money is taken at application */
  amountReceived?: number;
  receiptNumber?: string;
  /** yyyy-MM-dd: an existing application with its original date (ENTER_MEMBERSHIP) */
  submittedOn?: string;
}

export interface MembershipApproveRequest {
  /** yyyy-MM-dd; today when left out */
  date?: string;
  approvalNote?: string;
  receiptNumber?: string;
}

export interface MembershipRejectRequest {
  reason: string;
  /** yyyy-MM-dd; today when left out */
  date?: string;
  refundAmount?: number;
  refundReceiptNumber?: string;
}

/** The days-left chip: green with time to spare, amber in the last week, red once overdue. */
export type DeadlineTone = 'ok' | 'soon' | 'overdue';

/** Null when the application is decided, or the cooperative has no decision deadline. */
export function deadlineTone(application: MembershipApplication): DeadlineTone | null {
  if (application.status !== 'PENDING' || application.daysRemaining == null) {
    return null;
  }
  if (application.overdue) {
    return 'overdue';
  }
  return application.daysRemaining <= 7 ? 'soon' : 'ok';
}
