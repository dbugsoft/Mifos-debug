/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** What the cooperative dashboard endpoints return (fineract-dbug ADR 0021). Dates are yyyy-MM-dd. */

export interface DashMonth {
  bsYear: number;
  bsMonth: number;
  start: string;
  end: string;
}

export interface DashPeriod {
  fiscalYear: number;
  label: string;
  start: string;
  end: string;
  asOf: string;
  months: DashMonth[];
  current: boolean;
}

export interface Trend {
  value: number;
  previous: number | null;
  series: (number | null)[];
}

export interface Labelled {
  label: string;
  count: number;
  amount: number;
}

export interface Filters {
  offices: { id: number; name: string; parentId: number | null; depth: number }[];
  fiscalYears: { year: number; label: string }[];
  currentFiscalYear: number;
  currency: string;
}

export interface Summary {
  period: DashPeriod;
  members: Trend;
  savings: Trend;
  loansOutstanding: Trend;
  shareCapital: Trend;
  par30: number | null;
  savingsToLoanRatio: number | null;
  previousSavingsToLoanRatio: number | null;
  collectedToday: number;
  repaymentsToday: number;
}

export interface GenderCounts {
  male: number;
  female: number;
  other: number;
}

export interface Area {
  code: string;
  name: string;
  members: GenderCounts;
  children: Area[];
}

export interface Membership {
  period: DashPeriod;
  active: GenderCounts;
  womenShare: number;
  pending: number;
  dormant: number;
  closedThisYear: number;
  joinedThisYear: number;
  notLocated: number;
  provinces: Area[];
  joinsByFiscalYear: { fiscalYear: number; label: string; members: GenderCounts }[];
  ageBands: { band: string; members: GenderCounts }[];
  joinsByMonth: (number | null)[];
}

export interface Savings {
  period: DashPeriod;
  totalBalance: number;
  accounts: number;
  byProduct: {
    productId: number;
    name: string;
    kind: 'SAVINGS' | 'FIXED' | 'RECURRING';
    accounts: number;
    balance: number;
  }[];
  depositsByMonth: (number | null)[];
  withdrawalsByMonth: (number | null)[];
  fixedDepositsMaturing: { withinDays: number; count: number; amount: number }[];
  dormantAccounts: number;
  dormantBalance: number;
  topTenDepositorsShare: number;
  averageBalance: number;
}

export type LoanClassCode = 'PASS' | 'WATCHLIST' | 'SUBSTANDARD' | 'DOUBTFUL' | 'LOSS';

export interface ClassRow {
  code: LoanClassCode;
  label: string;
  minDaysOverdue: number;
  maxDaysOverdue: number | null;
  provisionRate: number;
  loans: number;
  outstanding: number;
  provision: number;
}

export interface Collection {
  due: number;
  collected: number;
  rate: number;
}

export interface Loans {
  period: DashPeriod;
  outstanding: number;
  activeLoans: number;
  overdue: number;
  par30: number;
  par90: number;
  nonPerformingShare: number;
  provisionRequired: number;
  classification: ClassRow[];
  byProduct: Labelled[];
  byPurpose: Labelled[];
  collectionThisMonth: Collection;
  collectionThisYear: Collection;
  disbursedByMonth: (number | null)[];
  principalRepaidByMonth: (number | null)[];
  interestByMonth: (number | null)[];
  topTenBorrowersShare: number;
  averageLoan: number;
}

export interface Capital {
  period: DashPeriod;
  shareCapital: number;
  shareholders: number;
  totalShares: number;
  averageHolding: number;
  memberCoverage: number;
  capitalByMonth: (number | null)[];
  purchasedByMonth: (number | null)[];
}

export interface Income {
  period: DashPeriod;
  income: number;
  expense: number;
  net: number;
  incomeByMonth: (number | null)[];
  expenseByMonth: (number | null)[];
  lines: { glCode: string; name: string; type: 'INCOME' | 'EXPENSE'; amount: number }[];
  loanInterestEarned: number;
  savingsInterestPaid: number;
  loanYield: number | null;
  costOfDeposits: number | null;
  spread: number | null;
}

export type ActionCode =
  | 'LOANS_DUE_THIS_WEEK'
  | 'LOANS_RECENTLY_OVERDUE'
  | 'FIXED_DEPOSITS_MATURING'
  | 'DOCUMENTS_EXPIRING'
  | 'LOANS_AWAITING_APPROVAL'
  | 'LOANS_AWAITING_DISBURSAL'
  | 'MEMBERS_AWAITING_ACTIVATION'
  | 'KYC_INCOMPLETE'
  | 'CASH_WITH_CASHIERS';

export interface ActionItem {
  entity: 'loan' | 'fixeddeposit' | 'client' | 'cashier';
  id: number;
  clientId: number | null;
  clientName: string;
  accountNo: string | null;
  detail: string | null;
  date: string | null;
  amount: number | null;
}

export interface ActionGroup {
  code: ActionCode;
  count: number;
  amount: number;
  items: ActionItem[];
}

export interface Actions {
  asOf: string;
  groups: ActionGroup[];
}

export type SectionName = 'summary' | 'membership' | 'savings' | 'loans' | 'capital' | 'income' | 'actions';

/** A section on screen: loading, failed, or loaded. */
export interface SectionState<T> {
  loading: boolean;
  error: boolean;
  data: T | null;
}
