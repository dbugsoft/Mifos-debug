/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { buildEligibilityRefusalMessage } from './eligibility-refusal';

const translations: Record<string, string> = {
  'loanEligibility.refusal.approve': 'This loan cannot be approved:',
  'loanEligibility.refusal.payout': 'This loan cannot be paid out:',
  'loanEligibility.refusal.MEMBERSHIP_AGE': 'The member has not been a member long enough.',
  'loanEligibility.refusal.COLLATERAL': 'Loans against gold or silver are not allowed.',
  'loanEligibility.refusal.seeCheck': 'For the numbers, use "Check loan eligibility" on the member\'s page.'
};

const translateFn = (key: string): string => translations[key] ?? key;

describe('buildEligibilityRefusalMessage', () => {
  it('returns null for English, so the caller keeps showing defaultUserMessage', () => {
    const message = buildEligibilityRefusalMessage(
      [
        { value: 123 },
        { value: 'MEMBERSHIP_AGE' }
      ],
      '/loans/123?command=approve',
      'This loan cannot be approved: A member may borrow 3 months after joining.',
      'en-US',
      translateFn
    );
    expect(message).toBeNull();
  });

  it('builds the approve title and one line per code for another language', () => {
    const message = buildEligibilityRefusalMessage(
      [
        { value: 123 },
        { value: 'MEMBERSHIP_AGE' },
        { value: 'COLLATERAL' }
      ],
      '/loans/123?command=approve',
      'default',
      'ne-NE',
      translateFn
    );
    expect(message).toBe(
      'This loan cannot be approved: The member has not been a member long enough. Loans against gold or silver are not allowed. For the numbers, use "Check loan eligibility" on the member\'s page.'
    );
  });

  it('uses the payout title when the request URL has no command=approve', () => {
    const message = buildEligibilityRefusalMessage(
      [
        { value: 123 },
        { value: 'COLLATERAL' }
      ],
      '/loans/123?command=disburse',
      'default',
      'ne-NE',
      translateFn
    );
    expect(message?.startsWith('This loan cannot be paid out:')).toBe(true);
  });

  it('skips a code with no translation and keeps the ones that have one', () => {
    const message = buildEligibilityRefusalMessage(
      [
        { value: 123 },
        { value: 'UNKNOWN_CODE' },
        { value: 'COLLATERAL' }
      ],
      '/loans/123?command=approve',
      'default',
      'ne-NE',
      translateFn
    );
    expect(message).toBe(
      'This loan cannot be approved: Loans against gold or silver are not allowed. For the numbers, use "Check loan eligibility" on the member\'s page.'
    );
  });

  it('falls back to defaultUserMessage when no code has a translation', () => {
    const message = buildEligibilityRefusalMessage(
      [
        { value: 123 },
        { value: 'UNKNOWN_CODE' }
      ],
      '/loans/123?command=approve',
      'default English message',
      'ne-NE',
      translateFn
    );
    expect(message).toBe('default English message');
  });

  it('falls back to defaultUserMessage when there are no args at all', () => {
    const message = buildEligibilityRefusalMessage(
      undefined,
      '/loans/123?command=approve',
      'default',
      'ne-NE',
      translateFn
    );
    expect(message).toBe('default');
  });
});
