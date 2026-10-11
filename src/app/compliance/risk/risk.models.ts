/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Grade } from '../compliance.models';

/** Member risk grades, as /nepal/aml/risk returns them (fineract-dbug #129, ADR 0040, docs/member-risk-grades.md). */

export type RiskBasis = 'PEP' | 'TRANSACTIONS' | 'OCCUPATION' | 'IDENTIFICATION' | 'GEOGRAPHY' | 'OTHER';
export type FlagKind = 'CRIME' | 'MEDIA' | 'UNDISCLOSED_SOURCE' | 'PRECIOUS_METALS' | 'ELECTRONIC_CHANNEL' | 'OTHER';

export const FLAG_KINDS: FlagKind[] = [
  'MEDIA',
  'CRIME',
  'UNDISCLOSED_SOURCE',
  'PRECIOUS_METALS',
  'ELECTRONIC_CHANNEL',
  'OTHER'
];
export const GRADES: Grade[] = [
  'HIGH',
  'MEDIUM',
  'NORMAL'
];
export const EDD_DECISIONS = [
  'CONTINUE',
  'LIMIT',
  'END_RELATIONSHIP',
  'REPORT'
];

export interface RiskListRow {
  clientId: number;
  name: string;
  accountNo: string;
  office: string;
  grade: Grade;
  computedGrade: Grade;
  overrideGrade: Grade | null;
  nextReviewOn: string | null;
  /** The bases behind the grade, comma-separated */
  bases: string | null;
}

export interface RiskSummary {
  byGrade: Record<Grade, number>;
  reviewsOverdue: number;
  overridden: number;
  highByBasis: Record<RiskBasis, number>;
}

export interface RiskReason {
  rule: string;
  grade: Grade;
  basis: RiskBasis;
  detail: string | null;
}

export interface RiskFlag {
  id: number;
  kind: FlagKind;
  grade: Grade;
  detail: string;
  source: string | null;
  createdBy: string;
  createdAt: string;
  endedAt: string | null;
  endReason: string | null;
}

export interface RiskHistoryRow {
  changedAt: string;
  computedGrade: Grade;
  grade: Grade;
  changedBy: string | null;
  note: string | null;
}

export interface MemberRisk {
  clientId: number;
  name: string;
  accountNo: string;
  computedGrade: Grade;
  overrideGrade: Grade | null;
  overrideReason: string | null;
  overrideBy: string | null;
  overrideAt: string | null;
  grade: Grade;
  assessedAt: string;
  lastReviewOn: string | null;
  reviewedBy: string | null;
  nextReviewOn: string | null;
  reviewDue: boolean;
  reasons: RiskReason[];
  flags: RiskFlag[];
  history: RiskHistoryRow[];
}

export interface PepExposure {
  pepId: number;
  fullName: string;
  post: string | null;
  postDetail: string | null;
  leftOfficeOn: string | null;
  relationship: 'SELF' | 'FAMILY' | 'ASSOCIATE';
  relationshipDetail: string | null;
}

export interface EddReview {
  reviewedOn: string;
  reviewedBy: string;
  sourceOfAssets: string | null;
  findings: string;
  decision: string;
}

export interface Edd {
  id: number;
  clientId: number;
  name: string;
  accountNo: string;
  openedOn: string;
  /** Null when it opened by itself */
  openedBy: string | null;
  why: string;
  triggers: string | null;
  sourceOfAssets: string | null;
  findings: string | null;
  decision: string | null;
  lastReviewOn: string | null;
  reviewedBy: string | null;
  nextReviewOn: string;
  closedOn: string | null;
  closedBy: string | null;
  closeFinding: string | null;
  reviews?: EddReview[];
}

export interface EddSummary {
  open: number;
  reviewsDue: number;
}
