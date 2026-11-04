/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Elections for the board and the accounts supervision committee (fineract-dbug #144; docs/governance-elections.md).
 * Fineract leaves a field with no value out of its answers, so a field typed `| null` may be missing.
 */

export const ELECTION_STATUSES = [
  'OPEN',
  'ROLL_FROZEN',
  'LIST_PUBLISHED',
  'DECLARED',
  'CANCELLED'
];

export const NOMINATION_STATUSES = [
  'ACCEPTED',
  'REFUSED',
  'WITHDRAWN'
];

export const NOMINATION_PROBLEM_CODES = [
  'NOT_ON_ROLL',
  'ORGANISATION',
  'ON_ELECTION_COMMITTEE',
  'TOO_MANY_TERMS',
  'REMOVED',
  'BLACKLISTED',
  'IN_DEFAULT',
  'EMPLOYEE',
  'MEMBER_TOO_SHORT'
];

export const VOTER_LEFT_OUT_REASONS = [
  'NOT_ACTIVE',
  'NO_SHARES',
  'LEAVING'
];

export interface ElectionCommittee {
  id: number;
  code: string;
  name: string;
}

export interface ElectionCommitteeMember {
  personId: number;
  name: string;
  positionCode: string;
  positionName: string;
}

export interface NominationProblem {
  code: string;
  message: string;
}

export interface NominationWarning {
  code: string;
  message: string;
}

export interface Nomination {
  id: number;
  clientId: number;
  accountNo: string;
  name: string;
  committeeId: number;
  committeeCode: string;
  committeeName: string;
  positionId: number;
  positionCode: string;
  positionName: string;
  nominatedOn: string;
  proposedBy: string | null;
  status: 'ACCEPTED' | 'REFUSED' | 'WITHDRAWN';
  problems: NominationProblem[];
  warnings: NominationWarning[];
  checkedOn: string;
  votes: number | null;
  elected: boolean | null;
  termId: number | null;
  withdrawReason: string | null;
  recordedBy: string;
}

export interface Voter {
  clientId: number;
  accountNo: string;
  name: string;
  officeName: string | null;
  joinedOn: string;
  shares: number;
  included: boolean;
  reason: 'NOT_ACTIVE' | 'NO_SHARES' | 'LEAVING' | null;
}

export interface Election {
  id: number;
  title: string;
  status: 'OPEN' | 'ROLL_FROZEN' | 'LIST_PUBLISHED' | 'DECLARED' | 'CANCELLED';
  electionOn: string;
  cutOffOn: string;
  minMembershipMonths: number;
  calledByDecisionId: number | null;
  calledByDecision: string | null;
  note: string | null;
  committees: ElectionCommittee[];
  votersIncluded: number | null;
  votersLeftOut: number | null;
  meetingId: number | null;
  meetingHeldOn: string | null;
  resultDecisionId: number | null;
  resultDecision: string | null;
  termsStartOn: string | null;
  recordedBy: string;
  rollFrozenOn: string | null;
  listPublishedOn: string | null;
  declaredOn: string | null;
  cancelReason: string | null;
  electionCommittee: ElectionCommitteeMember[];
  staffNotLinked: number;
  nominations: Nomination[];
}

/** An election in the list: newest first, without electionCommittee, staffNotLinked or nominations. */
export type ElectionSummary = Omit<Election, 'electionCommittee' | 'staffNotLinked' | 'nominations'>;

export interface ElectionResultEntry {
  nominationId: number;
  votes?: number;
  elected: boolean;
}

export interface ElectionsApiErrorDetail {
  parameterName?: string;
  defaultUserMessage?: string;
}
