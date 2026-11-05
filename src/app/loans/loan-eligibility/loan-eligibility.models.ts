/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Collateral kinds the backend checks a rule against (fineract-dbug #154; docs/loan-eligibility.md). */
export const COLLATERAL_KINDS = [
  'NONE',
  'DEPOSIT',
  'LAND_CITY',
  'LAND_ELSEWHERE',
  'GOLD_SILVER',
  'OTHER'
] as const;
export type CollateralKind = (typeof COLLATERAL_KINDS)[number];

/** The four collateral kinds a product or type may be marked as in the settings tab (never NONE or OTHER). */
export const MARKABLE_COLLATERAL_KINDS = [
  'DEPOSIT',
  'LAND_CITY',
  'LAND_ELSEWHERE',
  'GOLD_SILVER'
] as const;
export type MarkableCollateralKind = (typeof MARKABLE_COLLATERAL_KINDS)[number];

/** Rule codes the check and the approval/payout refusal both use. */
export const RULE_CODES = [
  'MEMBERSHIP_AGE',
  'KYM',
  'OVERDUE',
  'WRITTEN_OFF',
  'SINGLE_MEMBER_LIMIT',
  'DIRECTOR',
  'UNSECURED_LIMIT',
  'GUARANTORS',
  'DEPOSIT_LIMIT',
  'LAND_LIMIT',
  'COLLATERAL'
] as const;
export type RuleCode = (typeof RULE_CODES)[number];

export type RuleOutcome = 'PASS' | 'FAIL' | 'NOT_CHECKED';

/** The 13 rule fields a cooperative sets (docs/loan-eligibility.md). */
export interface LoanEligibilityRules {
  enabled: boolean;
  membershipMonths: number;
  unsecuredMembershipMonths: number;
  kymRequired: boolean;
  noOverdueLoans: boolean;
  overdueGraceDays: number;
  singleMemberPercent: number;
  savingsMultiple: number;
  unsecuredCap: number;
  guarantorsRequired: number;
  depositPercent: number;
  landPercentCity: number;
  landPercentElsewhere: number;
}

/** Ids of Fineract's collateral products/types, grouped by the kind each is marked as. An unmarked one is left out. */
export type CollateralIdsByKind = Record<MarkableCollateralKind, number[]>;

export interface LoanEligibilitySettings {
  rules: LoanEligibilityRules;
  capitalGlAccountIds: number[];
  regularSavingsProductIds: number[];
  collateralProductIds: CollateralIdsByKind;
  collateralTypeIds: CollateralIdsByKind;
}

/** The regulator's values: the 13 rule fields only (never `enabled` or the lists). */
export type LoanEligibilityDefaults = Omit<LoanEligibilityRules, 'enabled'>;

export interface LoanEligibilityRulesResponse {
  settings: LoanEligibilitySettings;
  defaults: LoanEligibilityDefaults;
}

/** Fineract's command result from `PUT rules`: each changed value, keyed the way Fineract names it. */
export interface LoanEligibilityCommandResult {
  changes?: Record<string, unknown>;
}

export interface LoanEligibilityCheckRequest {
  clientId: number;
  amount: number;
  collateral: CollateralKind;
  collateralValue?: number;
  guarantors?: number;
}

/** The `request` object echoed back in the check response - the same fields sent, minus `clientId` (that's a
 * sibling of `request` on the response itself, per docs/loan-eligibility.md's own example). */
export interface LoanEligibilityCheckRequestEcho {
  amount: number;
  collateral: CollateralKind;
  collateralValue?: number | null;
  guarantors?: number | null;
}

export interface LoanEligibilityFacts {
  today: string;
  joinedOn: string;
  foundingMember: boolean;
  kymVerified: boolean;
  overdueLoans: number;
  writtenOffLoans: number;
  outstanding: number;
  primaryCapital?: number | null;
  regularSavings: number;
  director: boolean;
}

export interface LoanEligibilityRuleResult {
  code: RuleCode;
  outcome: RuleOutcome;
  reason: string;
  limit?: number | null;
  value?: number | null;
  eligibleFrom?: string | null;
}

export interface LoanEligibilityResult {
  eligible: boolean;
  eligibleFrom?: string | null;
  rules: LoanEligibilityRuleResult[];
}

export interface LoanEligibilityCheckResponse {
  clientId: number;
  request: LoanEligibilityCheckRequestEcho;
  facts: LoanEligibilityFacts;
  result: LoanEligibilityResult;
}

// ---- settings tab lookups

export interface GlAccountOption {
  id: number;
  name: string;
}

export interface SavingsProductOption {
  id: number;
  name: string;
}

export interface CollateralProductOption {
  id: number;
  name: string;
  quality?: string;
  basePrice?: number;
  unitType?: string;
}

export interface CodeOption {
  id: number;
  name: string;
}

export interface CollateralTypeOption {
  id: number;
  name: string;
}

/** One row of "Collateral on this application" (Part 3, prefilled from the New Loan Terms step). */
export interface ApplicationCollateralItem {
  name: string;
  value: number;
}
