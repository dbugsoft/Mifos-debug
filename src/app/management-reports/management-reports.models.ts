/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PearlsIndicator } from 'app/coop-dashboard/coop-dashboard.models';

/**
 * The management report (fineract-dbug #142, ADR-0032; docs/management-report.md): the chief executive's report of
 * a period, approved by the board as a frozen snapshot. Fineract leaves a field with no value out of its answers
 * (except inside `content`, where it is `null`), so a field typed `| null` may be missing instead.
 */

export const REPORT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'RETURNED',
  'DISCARDED'
];

export const DISCARDABLE_STATUSES = [
  'DRAFT',
  'RETURNED'
];

export interface ReportSummary {
  id: number;
  officeId: number;
  officeName: string;
  from: string;
  to: string;
  fromBs: string;
  toBs: string;
  fiscalYear: number;
  status: string;
  replacesId: number | null;
  generatedAt: string | null;
  submittedAt: string | null;
  decisionReference: string | null;
  decidedAt: string | null;
}

export interface Report {
  id: number;
  officeId: number;
  officeName: string;
  from: string;
  to: string;
  fromBs: string;
  toBs: string;
  fiscalYear: number;
  status: string;
  notes: string | null;
  contentSha256: string | null;
  replacesId: number | null;
  replacedById: number | null;
  createdBy: string;
  createdAt: string;
  generatedBy: string | null;
  generatedAt: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  decisionId: number | null;
  decisionReference: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  discardedBy: string | null;
  discardedAt: string | null;
  discardReason: string | null;
  content: ReportContent | null;
}

/** A period shortcut: each BS month and quarter already over, and the fiscal year so far. */
export interface Period {
  code: string;
  kind: 'MONTH' | 'QUARTER' | 'YEAR_TO_DATE';
  bsYear: number;
  number: number;
  from: string;
  to: string;
  fromBs: string;
  toBs: string;
}

// ── The report itself, as stored (docs/management-report.md: "What content holds") ──

export interface ReportContent {
  version: number;
  period: Span;
  office: Place;
  generatedAt: string;
  notes: string | null;
  members: Members;
  deposits: Deposits;
  loans: Loans;
  income: Income;
  spread: Spread;
  pearls: ReportPearls;
  /** Only in a report on the whole cooperative; `null` for a branch. */
  relatedParties: RelatedParties | null;
  compliance: Compliance;
}

export interface Span {
  from: string;
  to: string;
  fromBs: string;
  toBs: string;
  fiscalYear: number;
  fiscalYearLabel: string;
  days: number;
}

export interface Place {
  id: number;
  name: string;
}

/** Members at the start (the day before the period) and the end, and share capital the same way. */
export interface Members {
  atStart: number;
  joined: number;
  left: number;
  atEnd: number;
  shareCapitalAtStart: number;
  sharesBought: number;
  sharesRefunded: number;
  shareCapitalAtEnd: number;
}

export interface Deposits {
  atStart: number;
  deposited: number;
  withdrawn: number;
  interestPosted: number;
  atEnd: number;
  byProduct: DepositLine[];
}

export interface DepositLine {
  product: string;
  kind: 'SAVINGS' | 'FIXED' | 'RECURRING';
  accounts: number;
  balance: number;
}

export interface Loans {
  outstandingAtStart: number;
  loansDisbursed: number;
  disbursed: number;
  principalCollected: number;
  interestCollected: number;
  outstandingAtEnd: number;
  loansAtEnd: number;
  classes: ClassLine[];
  provisionRequired: number;
  overdue30Percent: number;
  nonPerformingPercent: number;
  largest: LargeLoan[];
}

export interface ClassLine {
  code: string;
  label: string;
  loans: number;
  outstanding: number;
  provisionRate: number;
  provision: number;
}

export interface LargeLoan {
  accountNo: string;
  borrower: string;
  outstanding: number;
  daysOverdue: number;
  loanClass: string;
}

export interface Income {
  income: number;
  expense: number;
  surplus: number;
  accounts: AccountLine[];
}

export interface AccountLine {
  glCode: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
}

export interface Spread {
  loanYield: number | null;
  depositCost: number | null;
  spread: number | null;
  cap: number | null;
  withinCap: boolean | null;
}

/** Shaped like the dashboard's own PEARLS (ADR-0022), minus the dashboard-only `period` field. */
export interface ReportPearls {
  indicators: PearlsIndicator[];
  met: number;
  notMet: number;
  noData: number;
  notApplicable: number;
}

export interface RelatedParties {
  asOf: string;
  borrowers: number;
  relatedOutstanding: number;
  directorsOutstanding: number;
}

export interface Compliance {
  thresholdReportsFiled: number;
  suspiciousReportsFiled: number;
}

export interface Office {
  id: number;
  name: string;
  nameDecorated: string;
}

export interface ReportApiErrorDetail {
  parameterName?: string;
  defaultUserMessage?: string;
}
