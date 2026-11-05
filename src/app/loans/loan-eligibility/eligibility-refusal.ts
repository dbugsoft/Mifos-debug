/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Fineract's `errors[].args` entry: `{ value: ... }`. */
export interface EligibilityRefusalArg {
  value: unknown;
}

/** The English code (`error.msg.loan.eligibility.failed`) the global error interceptor matches on. */
export const ELIGIBILITY_REFUSAL_CODE = 'error.msg.loan.eligibility.failed';

/**
 * Builds the approval/payout refusal message in the user's own language (fineract-dbug #154;
 * docs/loan-eligibility.md): `args[0]` is the loan id, every arg after it the code of a rule that failed.
 *
 * English keeps showing the backend's own `defaultUserMessage` (it already has the numbers in it), so this
 * returns `null` there to tell the caller to leave the message alone. Any other language builds the message from
 * the codes: a title (approve or payout, by whether the request URL asked for `command=approve`), one line per
 * code that has a translation, and a closing line pointing at the check. A code with no translation is skipped;
 * if none of them have one, this falls back to `defaultUserMessage` too.
 */
export function buildEligibilityRefusalMessage(
  args: EligibilityRefusalArg[] | undefined,
  requestUrl: string,
  defaultUserMessage: string | undefined,
  lang: string,
  translateFn: (key: string) => string
): string | null {
  if (lang === 'en-US') {
    return null;
  }
  const codes = (args ?? []).slice(1).map((a) => String(a.value));
  const lines = codes
    .map((code) => {
      const key = `loanEligibility.refusal.${code}`;
      const translated = translateFn(key);
      return translated !== key ? translated : null;
    })
    .filter((line): line is string => line != null);
  if (!lines.length) {
    return defaultUserMessage ?? null;
  }
  const titleKey = requestUrl.includes('command=approve')
    ? 'loanEligibility.refusal.approve'
    : 'loanEligibility.refusal.payout';
  return [
    translateFn(titleKey),
    ...lines,
    translateFn('loanEligibility.refusal.seeCheck')
  ].join(' ');
}
