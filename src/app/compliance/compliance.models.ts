/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** What the signed-in user may see in Compliance (GET /nepal/aml/access). */
export interface ComplianceAccess {
  permissions: string[];
  showMenu: boolean;
  holders?: ComplianceHolder[] | null;
}

export interface ComplianceHolder {
  userId: number;
  username: string;
  name: string;
  office: string;
  roles: string[];
  permissions: string[];
}

export type Grade = 'HIGH' | 'MEDIUM' | 'NORMAL';

/** The cooperative's AML settings (fineract-dbug issue #196). */
export interface AmlSettings {
  riskLine: number;
  atLineCountsAs: Grade;
  lineMeasured: 'PER_PRODUCT' | 'COMBINED';
  unusualYearlyLine: number;
  yearBasis: 'FISCAL_YEAR' | 'ROLLING_12_MONTHS';
  eddMonitoringLine: number;
  sourceOfFundsLine: number;
  sourceOfFundsDayTotal: boolean;
  secondApproverAbove?: number | null;
  ttrLine: number;
  ttrDays: number;
  strTargetDays: number;
  reviewYearsHigh: number;
  reviewYearsMedium: number;
  reviewYearsNormal: number;
  fullKymBelowLineGrade: Grade;
  kymGateEnabled: boolean;
  kymGateAllFrom?: string | null;
  changeNoticeDays: number;
  retentionYears: number;
  pepRetentionYears: number;
  structuringWindowDays: number;
  structuringBandPercent: number;
  remittanceService: boolean;
  sharesCountAsCash: boolean;
  unknownPaymentCountsAsCash: boolean;
  goamlEntityId?: string | null;
  goamlBranchCode?: string | null;
  screeningPossibleScore: number;
  screeningLikelyScore: number;
  unListUrl: string;
  /** Relationships on the source-of-funds, KYM, beneficial owner and PEP screens only from the list (ADR-0046) */
  relationshipsFromList?: boolean;
}

export type CashClass = 'CASH' | 'COOP_BANK_CASH' | 'NON_CASH';

export interface PaymentTypeClass {
  id: number;
  name: string;
  fineractCashPayment: boolean;
  /** Absent when nobody has classified the payment type yet. */
  cashClass?: CashClass | null;
}

export interface AmlSettingsView {
  settings: AmlSettings;
  policyDefaults: AmlSettings;
  paymentTypes: PaymentTypeClass[];
  unclassified: number;
  lastChange?: { at: string; username: string; name: string } | null;
}

/** What settings would have done over the last 12 months, beside the settings as they are (GET /nepal/aml/settings/effect). */
export interface SettingsEffect {
  from: string;
  to: string;
  thresholdReports: { now: number; then: number };
  unusualYearly: { now: number; then: number };
  sourceOfFunds: { now: number; then: number };
}

/** One change to the settings (GET /nepal/aml/settings/history). */
export interface SettingsChange {
  at: string;
  username: string | null;
  name: string | null;
  /** Setting to its new value as text; `paymentClasses` maps a payment type id to its class. */
  changes: Record<string, string | Record<string, string> | null>;
  reason: string | null;
  /** A change recorded before reasons existed, as recorded. */
  text: string | null;
}

/** Counts for the Compliance home (GET /nepal/aml/ttr/summary). */
export interface TtrSummary {
  toReport: number;
  overdue: number;
  dueSoon: number;
  historical: number;
  needsCorrection: number;
  nextDue?: string | null;
}

export type TtrStatus = 'NEW' | 'HISTORICAL' | 'EXEMPT' | 'IN_REPORT' | 'REPORTED' | 'WITHDRAWN';

/** A threshold transaction to report to FIU-Nepal (fineract-dbug issue #131). */
export interface TtrItem {
  id: number;
  subjectType: 'CLIENT' | 'GROUP';
  subjectId: number;
  clientId?: number | null;
  name: string;
  accountNo: string;
  office: string;
  transactionDate: string | number[];
  direction: 'IN' | 'OUT';
  basis: 'COUNTER' | 'COOP_BANK';
  totalAmount: number;
  movementCount: number;
  thresholdUsed: number;
  dueOn: string | number[];
  daysLeft?: number | null;
  status: TtrStatus;
  statusReason?: string | null;
  needsCorrection: boolean;
  reportId?: number | null;
}

export interface Movement {
  id: number;
  clientId: number;
  transactionDate: string | number[];
  product: 'SAVINGS' | 'LOAN' | 'SHARE';
  kind: string;
  direction: 'IN' | 'OUT';
  paymentType?: string | null;
  cashClass: string;
  amount: number;
  sourceTable: string;
  sourceId: number;
  counted: boolean;
}

export interface TtrItemDetail {
  item: TtrItem;
  movements: Movement[];
}

/**
 * One of our rows of FIU-Nepal's codes (fineract-dbug #288; docs/goaml-reports.md, "Codes"): what Fineract calls
 * this value (`ourValue`) in a group of values of this `type` (for example `gender`), its human label
 * (`description`, read-only - filled in from the schema), and the FIU-Nepal `code` an officer picks for it.
 * `institution`'s two rows (`NAME`, `CODE`) have no list - free text instead of a select.
 */
export interface GoamlLookup {
  type: string;
  ourValue: string;
  code?: string | null;
  description?: string | null;
}

/** Keyed by lookup `type`, each a FIU-Nepal code the schema in use allows for it (GET /nepal/aml/goaml/code-lists);
 * `institution` is absent, since it has no list. */
export type GoamlCodeLists = Record<string, string[]>;

export type GoamlStatus = 'DRAFT' | 'READY' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'CORRECTED' | 'DISCARDED';

/** A goAML report (fineract-dbug issue #134). */
export interface GoamlReport {
  id: number;
  reference: string;
  type: 'TTR' | 'STR' | 'SAR';
  status: GoamlStatus;
  clientId?: number | null;
  clientName?: string | null;
  dueOn?: string | null;
  problems: string[];
  createdAt?: string;
  /** The login that made it, and the one that recorded it sent (ADR-0064). */
  createdBy?: string | null;
  submittedBy?: string | null;
  submittedOn?: string | null;
  fiuReference?: string | null;
  outcomeNote?: string | null;
  replacesReportId?: number | null;
  caseId?: number | null;
  warnings?: string[];
  notes?: GoamlNote[];
  /** The books changed since the file was made: rebuild it before sending. */
  stale?: boolean;
  filedByHand?: boolean;
  handReason?: string | null;
  /** The same as problems, for translating and linking; empty on a report made before details existed. */
  problemDetails?: GoamlGap[];
  warningDetails?: GoamlGap[];
}

/** Where a gap is fixed (docs/goaml-reports.md, "Problems and warnings for screens"). */
export type GoamlFix = 'MEMBER' | 'AML_SETTINGS' | 'GOAML_CODES' | 'OFFICER' | 'NONE';

/** Something that keeps a report a draft (a problem) or was filled in with a stand-in (a warning). */
export interface GoamlGap {
  code: string;
  message: string;
  arguments: string[];
  fix: GoamlFix;
  clientId?: number | null;
}

/** Something the officer should know about what just happened to a report. */
export interface GoamlNote {
  code: string;
  message: string;
  arguments: string[];
}

export type ReportType = 'TTR' | 'STR' | 'SAR';

/** Where each report type stands (GET /nepal/aml/today/reports, ADR-0062). */
export interface ReportStepCounts {
  toMake: number;
  needsFixing: number;
  ready: number;
  sent: number;
  accepted: number;
  late: number;
  soon: number;
}

export interface ReportSteps {
  today: string;
  fiscalYear: number;
  fiscalYearFrom: string;
  types: Record<ReportType, ReportStepCounts>;
  /** Threshold items found after their deadline, waiting for a decision. */
  foundLate: number;
}

/** The goAML setup checklist (GET /nepal/aml/goaml/readiness). */
export interface GoamlReadiness {
  ready: boolean;
  items: { code: string; ok: boolean; required: boolean; message: string; fix: GoamlFix }[];
  codesEmpty: GoamlLookup[];
  codesNotInList: GoamlLookup[];
}

export type SchemaRuleCheck = 'OUR_RULES' | 'FINERACT' | 'NOT_FOR_US' | 'NOT_CHECKED';

/** The goAML schema in use (GET /nepal/aml/goaml/schema). */
export interface GoamlSchemaInfo {
  uploaded: boolean;
  inUse: 'PUBLISHED' | 'UPLOADED';
  publishedLabel?: string;
  note?: string;
  id?: number;
  label?: string;
  uploaded_at?: string;
  size?: number;
  rulesNotReadByTheChecker: { rule: string; checkedBy: SchemaRuleCheck }[];
  reportsBackToDraft?: number;
}

export interface LedgerStatus {
  movements: number;
  counted: number;
  firstDate?: string | null;
  lastDate?: string | null;
  lastRefreshed?: string | null;
  lastReconciled?: string | null;
}

/** Dates from Fineract come as yyyy-MM-dd or as [y, m, d]; always yyyy-MM-dd here. */
export function isoDate(value: string | number[] | null | undefined): string {
  if (!value) {
    return '';
  }
  if (Array.isArray(value)) {
    const [
      y,
      m,
      d
    ] = value;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return value.length > 10 ? value.slice(0, 10) : value;
}

/** The places of the Compliance menu that count what waits in them (fineract-dbug ADR 0060). */
export type CompliancePlace = 'REPORTS' | 'SUSPICIONS' | 'MEMBERS' | 'DUTIES' | 'SETTINGS';

/** How many wait in a place, how many are late, how many due within 3 days. */
export interface PlaceTally {
  waiting: number;
  late: number;
  soon: number;
}

export type TodayKind =
  | 'MATCH'
  | 'STR'
  | 'SAR'
  | 'TTR'
  | 'CONCERN'
  | 'ALERT'
  | 'CASE'
  | 'REVIEWS'
  | 'EDD_REVIEWS'
  | 'YEARLY'
  | 'DUTY';

export type TodayAction =
  | 'MAKE'
  | 'FIX'
  | 'REBUILD'
  | 'SEND'
  | 'FILE_BY_HAND'
  | 'CORRECT'
  | 'DECIDE_LATE'
  | 'LOOK_INTO'
  | 'DECIDE'
  | 'DECIDE_MATCH'
  | 'REVIEW'
  | 'DO';

/** One line of the Today list. */
export interface TodayItem {
  kind: TodayKind;
  action: TodayAction;
  /** The report, threshold item, alert or match; for a yearly report, its fiscal year. */
  id: number | null;
  caseId: number | null;
  reference: string | null;
  clientId: number | null;
  name: string | null;
  accountNo: string | null;
  office: string | null;
  amount: number | null;
  /** A code: the alert rule, the duty, the yearly report's type, the list, a direction, or a count of problems. */
  detail: string | null;
  /** For a line standing for several members. */
  count: number | null;
  dueOn: string | null;
  daysLeft: number | null;
}

/** Counts by kind, with their total. */
export type KindCounts = { total: number } & Partial<Record<TodayKind | string, number>>;

/** GET /nepal/aml/today */
export interface ComplianceToday {
  today: string;
  /** False for those who see counts only: the list then holds only the officer's duties. */
  names: boolean;
  places: Partial<Record<CompliancePlace, PlaceTally>>;
  late: KindCounts;
  soon: KindCounts;
  alerts?: { open: number; highRisk: number };
  sentThisMonth?: KindCounts;
  items: TodayItem[];
  more: number;
}
