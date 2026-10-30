/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Related parties (fineract-dbug #139, ADR-0052; docs/related-parties.md): the people who govern the cooperative,
 * their family and relatives who are members, and the member organisations they control. Nothing here is stored -
 * every answer is worked out from who serves today, KYM family members, and the links added here.
 */

export type Closeness = 'SELF' | 'FAMILY' | 'RELATIVE' | 'BUSINESS';
export type StepSource = 'KYM' | 'REGISTER' | 'ORGANISATION';

/** A seat that makes its holder's family related parties. */
export interface Seat {
  committeeCode: string;
  committeeName: string;
  positionCode: string;
  positionName: string;
}

/** A person whose family and relatives are related parties; director for a seat on the board. */
export interface Officer {
  personId: number;
  clientId: number | null;
  accountNo: string | null;
  name: string;
  director: boolean;
  seats: Seat[];
}

/** One link of the chain from the officer to the member: "toName is fromName's relationship". */
export interface Step {
  fromName: string;
  fromClientId: number | null;
  toName: string;
  toClientId: number | null;
  relationshipCode: string | null;
  relationship: string | null;
  source: StepSource;
  linkId: number | null;
}

/** One way a member is a related party: of which officer, how close, as what, the chain in words and steps. */
export interface Way {
  personId: number;
  officerName: string;
  director: boolean;
  closeness: Closeness;
  kin: string;
  kinLabel: string;
  endedMarriage: boolean;
  how: string;
  steps: Step[];
}

/** A member who is a related party, with every officer they are related to. */
export interface RelatedMember {
  clientId: number;
  accountNo: string;
  name: string;
  officeName: string | null;
  organisation: boolean;
  officer: boolean;
  director: boolean;
  ways: Way[];
}

/** A family member on an officer's own record (KYM) who is not linked to any member. */
export interface NotLinked {
  personId: number;
  officerName: string;
  familyMemberId: number;
  name: string;
  relationship: string | null;
  possibleClientId: number | null;
  possibleAccountNo: string | null;
  possibleName: string | null;
}

/** The register of related parties today. */
export interface RelatedPartiesRegister {
  asOf: string;
  officers: Officer[];
  members: RelatedMember[];
  notLinked: NotLinked[];
}

/** A link staff added, removed ones included. */
export interface Link {
  id: number;
  personId: number;
  clientId: number;
  accountNo: string;
  name: string;
  relationshipCode: string;
  relationshipDetail: string | null;
  relationship: string;
  marriageEnded: boolean;
  note: string | null;
  addedOn: string;
  addedBy: string;
  removed: boolean;
  removeReason: string | null;
}

/** One person of the register: their login, the links staff added, and everybody related to them. */
export interface PersonParties {
  personId: number;
  name: string;
  clientId: number | null;
  userId: number | null;
  username: string | null;
  links: Link[];
  related: RelatedMember[];
  notLinked: NotLinked[];
}

export interface LoanLine {
  loanId: number;
  accountNo: string;
  product: string;
  status: string;
  principal: number;
  outstanding: number;
  overdue: number;
  disbursedOn: string;
}

/** A loan of somebody else that the member guarantees; amount is what is held of their savings for it. */
export interface GuaranteeLine {
  loanId: number;
  accountNo: string;
  borrowerClientId: number;
  borrowerName: string;
  status: string;
  outstanding: number;
  amount: number | null;
}

export interface Borrower {
  member: RelatedMember;
  loans: LoanLine[];
  guarantees: GuaranteeLine[];
  outstanding: number;
}

/** One line of "credit taken by directors" in the yearly return. */
export interface DirectorCredit {
  personId: number;
  name: string;
  clientId: number | null;
  accountNo: string | null;
  loans: number;
  principal: number;
  outstanding: number;
}

/** Loans and guarantees of related parties, and the credit taken by directors. */
export interface LoanReport {
  asOf: string;
  parties: Borrower[];
  directors: DirectorCredit[];
  directorsOutstanding: number;
  relatedOutstanding: number;
}

export interface RelatedPartyApiErrorDetail {
  parameterName?: string;
  defaultUserMessage?: string;
}
