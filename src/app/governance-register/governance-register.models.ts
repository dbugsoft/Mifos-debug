/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * The governance register (fineract-dbug #138; docs/governance-register.md): committees, positions, people and
 * their terms, documents and declarations. Kept apart from the AML-focused Compliance > Governance screen.
 * Fineract leaves a field with no value out of its answers, so a field typed `| null` may be missing.
 */

export const BUILT_IN_COMMITTEE_CODES = [
  'BOARD',
  'ACCOUNTS_SUPERVISION',
  'LOAN_SUB_COMMITTEE',
  'EDUCATION_SUB_COMMITTEE',
  'ELECTION_COMMITTEE',
  'MANAGEMENT'
];

export const BUILT_IN_POSITION_CODES = [
  'CHAIR',
  'VICE_CHAIR',
  'SECRETARY',
  'TREASURER',
  'CONVENER',
  'MEMBER',
  'CHIEF_EXECUTIVE',
  'ADVISER'
];

export const TERM_END_REASONS = [
  'COMPLETED',
  'RESIGNED',
  'REMOVED',
  'DIED',
  'LEFT_COOPERATIVE',
  'COMMITTEE_DISSOLVED',
  'OTHER'
];

export const DECLARATION_KINDS = [
  'PROPERTY',
  'CONFLICT_OF_INTEREST'
];

export const DECLARATION_STATUSES = [
  'DECLARED',
  'LATE',
  'DUE',
  'OVERDUE',
  'NOT_YET'
];

export interface Remaining {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  ranOut: boolean;
}

export interface Warning {
  code: string;
  message: string;
  personId?: number | null;
  personName?: string | null;
  detail?: string | null;
}

export interface Term {
  id: number;
  personId: number;
  personName: string;
  clientId: number | null;
  accountNo: string | null;
  committeeId: number;
  committeeCode: string;
  committeeName: string;
  positionId: number;
  positionCode: string;
  positionName: string;
  startOn: string;
  servingSince: string;
  expectedEndOn: string | null;
  endedOn: string | null;
  endReason: string | null;
  endNote: string | null;
  decisionReference: string | null;
  note: string | null;
  continuesTermId: number | null;
  termNumber: number;
  current: boolean;
  remaining: Remaining | null;
  voided: boolean;
  voidReason: string | null;
  recordedBy: string;
}

export interface Committee {
  id: number;
  code: string;
  name: string;
  /** Seen live: BOARD, ACCOUNTS_SUPERVISION, SUB_COMMITTEE, ELECTION, MANAGEMENT, OTHER - not a closed set. */
  kind: string;
  /** Absent (not null) for a committee that isn't elected for a fixed term, e.g. the sub-committees. */
  termYears?: number | null;
  memberRequired: boolean;
  declaresProperty: boolean;
  builtIn: boolean;
  active: boolean;
  members: Term[];
  warnings: Warning[];
}

export interface Position {
  id: number;
  code: string;
  name: string;
  singleHolder: boolean;
  memberRequired: boolean;
  builtIn: boolean;
  active: boolean;
}

export interface PersonDocument {
  id: number;
  personId: number;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  addedOn: string;
  addedBy: string;
  removed?: boolean;
  removeReason?: string | null;
}

export interface Declaration {
  id: number;
  personId: number;
  personName: string;
  kind: 'PROPERTY' | 'CONFLICT_OF_INTEREST';
  fiscalYear: number | null;
  fiscalYearLabel: string | null;
  declaredOn: string;
  dueOn: string | null;
  status: string;
  subject: string | null;
  detail: string | null;
  decisionReference: string | null;
  fileName: string;
  recordedBy: string;
  voided: boolean;
  voidReason: string | null;
}

export interface Person {
  id: number;
  clientId: number | null;
  accountNo: string | null;
  name: string;
  memberStatus: 'ACTIVE' | 'NOT_ACTIVE' | null;
  officeName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  current: Term[];
  history: Term[];
  documents: PersonDocument[];
  canSeeDeclarations: boolean;
}

export interface PersonListItem {
  id: number;
  clientId: number | null;
  accountNo: string | null;
  name: string;
  memberStatus: 'ACTIVE' | 'NOT_ACTIVE' | null;
  officeName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  /** Positions held today - seen live on the search list too, not just the person page. */
  current: Term[];
}

export interface Director {
  personId: number;
  name: string;
  clientId: number | null;
  accountNo: string | null;
  positionCode: string;
  positionName: string;
  servingSince: string;
  termEndsOn: string | null;
  remaining: Remaining | null;
  termNumber: number;
}

export interface DirectorsTable {
  asOf: string;
  termYears: number;
  directors: Director[];
}

export interface PropertyDeclarant {
  personId: number;
  name: string;
  clientId: number | null;
  accountNo: string | null;
  committees: string[];
  declaredOn: string | null;
  status: string;
}

export interface PropertyDeclarations {
  fiscalYear: number;
  fiscalYearLabel: string;
  fiscalYearEnd: string;
  dueOn: string;
  declared: number;
  missing: number;
  people: PropertyDeclarant[];
}

export interface GovernanceApiErrorDetail {
  parameterName?: string;
  defaultUserMessage?: string;
}
