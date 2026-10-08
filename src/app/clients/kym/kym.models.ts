/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** A member's KYM as GET /nepal/kym/{clientId} returns it (fineract-dbug ADR 0039, docs/member-kym.md). */

export type KymStatus = 'INCOMPLETE' | 'COMPLETE' | 'VERIFIED';

export interface KymMissing {
  /** A stable code, for the translation and the tab where it is fixed */
  item: string;
  /** The server's plain words, used when there is no translation */
  message: string;
}

export interface KymPerson {
  clientId: number;
  name: string;
  accountNo: string;
  relationship?: string;
}

export interface KymOtherCoop {
  id?: number;
  whose: 'OWN' | 'FAMILY';
  personName?: string;
  relationship?: string;
  coopNameAddress: string;
  membershipNo?: string;
}

export interface KymIncomeSource {
  heading: string;
  detail?: string;
  amount: number;
}

export interface BeneficialOwner {
  id: number;
  ownerClientId: number | null;
  name: string;
  ownerAccountNo: string | null;
  citizenshipNo: string | null;
  dateOfBirth: string | null;
  relationship: string | null;
  control: string;
  controlDetail: string | null;
  sharePercent: number | null;
  identifiedBy: string;
  identifiedDetail: string | null;
  detailsMatch: boolean | null;
  otherInfluence: boolean | null;
  positionNormal: boolean | null;
  publicConsistent: boolean | null;
  checkNote: string | null;
  addedAt: string;
  addedBy: string;
  endedAt: string | null;
  endedBy: string | null;
  endReason: string | null;
}

/** The form's own fields, by the names the API uses. */
export interface KymValues {
  maritalStatus: string | null;
  familyType: string | null;
  occupationId: number | null;
  occupationDetail: string | null;
  noPan: boolean | null;
  otherEarnerFamilyMemberId: number | null;
  pepDeclared: boolean | null;
  pepName: string | null;
  pepRelationship: string | null;
  pepPost: string | null;
  workingAreaResidence: string | null;
  votingPollingPlace: string | null;
  timeInWorkingArea: string | null;
  purposeOfJoining: string | null;
  otherCoopMember: boolean | null;
  otherCoopPurpose: string | null;
  familyOtherCoopMember: boolean | null;
  familyOtherCoopPurpose: string | null;
  familyInThisCoop: boolean | null;
  incomeBand: string | null;
  initialSavings: number | null;
  initialOther: number | null;
  initialOtherDetail: string | null;
  expectedTransactionsYear: number | null;
  expectedDepositYear: number | null;
  expectedBorrowing: number | null;
  remarks: string | null;
  declarationAccepted: boolean | null;
  foundingMember: boolean | null;
  guardianClientId: number | null;
  guardianName: string | null;
  someoneElseDirects: boolean | null;
  otherCoops: KymOtherCoop[];
  incomeSources: KymIncomeSource[];
  recommenders: KymPerson[];
  familyHere: KymPerson[];
  beneficialOwners: BeneficialOwner[];
}

export interface KymView {
  clientId: number;
  level: 'FULL' | 'SIMPLIFIED' | null;
  simplifiedReason: string | null;
  status: KymStatus;
  missing: KymMissing[];
  values: KymValues;
  verifiedOn: string | null;
  verifiedBy: string | null;
  nextReviewOn: string | null;
  reviewDue: boolean;
}

export interface KymHistoryRow {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  happenedOn: string;
  recordedOn: string;
  inPerson: boolean;
  lateNotice: boolean;
  changedBy: string;
}

export const MARITAL_STATUSES = [
  'MARRIED',
  'UNMARRIED',
  'SINGLE'
];
export const FAMILY_TYPES = [
  'JOINT_ONE_KITCHEN',
  'JOINT_SEPARATE_KITCHENS',
  'NUCLEAR'
];
export const INCOME_BANDS = [
  'UP_TO_4_LAKH',
  'FROM_4_TO_10_LAKH',
  'FROM_10_TO_25_LAKH',
  'FROM_25_TO_50_LAKH',
  'ABOVE_50_LAKH'
];
export const INCOME_HEADINGS = [
  'FARMING',
  'BUSINESS',
  'DOMESTIC_EMPLOYMENT',
  'FOREIGN_EMPLOYMENT',
  'OTHER'
];
export const OWNER_CONTROLS = [
  'OWNS',
  'DIRECTS',
  'FUNDS',
  'BENEFITS',
  'OTHER'
];
export const OWNER_IDENTIFIED_BY = [
  'DOCUMENTS_SEEN',
  'MEMBER_DECLARED',
  'PUBLIC_RECORD',
  'OTHER'
];

/**
 * Where a missing item is put right: another tab of the member page (what Fineract keeps), or this tab's form.
 * Items not listed here are filled in on the KYM form.
 */
export const FIX_TAB: Record<string, string> = {
  dateOfBirth: 'personal-data',
  gender: 'personal-data',
  mobile: 'personal-data',
  citizenship: 'identities',
  citizenshipOffice: 'identities',
  citizenshipCopy: 'identities',
  voterCardCopy: 'identities',
  passportCopy: 'identities',
  pan: 'identities',
  permanentAddress: 'address',
  mother: 'family-members',
  father: 'family-members',
  spouse: 'family-members',
  spouseOccupation: 'family-members',
  thumbprint: 'documents',
  guardianThumbprint: 'documents',
  beneficialOwner: 'owners'
};
