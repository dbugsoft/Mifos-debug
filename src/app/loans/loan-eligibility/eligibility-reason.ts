/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { grouped } from 'app/coop-dashboard/coop-format';
import { LoanEligibilityRuleResult } from './loan-eligibility.models';

/**
 * The translation key for one rule row's reason (fineract-dbug #154; docs/loan-eligibility.md):
 * `loanEligibility.reason.<code>.<outcome>`, except a member who isn't active yet (MEMBERSHIP_AGE, FAIL, no
 * `limit`) which uses `.FAIL_INACTIVE` instead - there is no number of months to show for someone not yet a
 * member at all.
 */
export function eligibilityReasonKey(rule: Pick<LoanEligibilityRuleResult, 'code' | 'outcome' | 'limit'>): string {
  if (rule.code === 'MEMBERSHIP_AGE' && rule.outcome === 'FAIL' && rule.limit == null) {
    return 'loanEligibility.reason.MEMBERSHIP_AGE.FAIL_INACTIVE';
  }
  return `loanEligibility.reason.${rule.code}.${rule.outcome}`;
}

/**
 * The reason for one rule row, in the user's language, with `limit` and `value` already grouped the Nepali way
 * (`grouped()`, same as every other amount in the app). Falls back to the backend's own English `reason` when the
 * key has no translation, the same rule Part 4's refusal message follows.
 */
export function eligibilityReason(
  rule: Pick<LoanEligibilityRuleResult, 'code' | 'outcome' | 'limit' | 'value' | 'reason'>,
  translateFn: (key: string, params?: Record<string, unknown>) => string
): string {
  const key = eligibilityReasonKey(rule);
  const translated = translateFn(key, {
    limit: rule.limit != null ? grouped(rule.limit) : undefined,
    value: rule.value != null ? grouped(rule.value) : undefined
  });
  return translated !== key ? translated : rule.reason;
}
