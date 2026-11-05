/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { eligibilityReason, eligibilityReasonKey } from './eligibility-reason';

describe('eligibilityReasonKey', () => {
  it('builds the key from the code and outcome', () => {
    expect(eligibilityReasonKey({ code: 'OVERDUE', outcome: 'PASS' })).toBe('loanEligibility.reason.OVERDUE.PASS');
    expect(eligibilityReasonKey({ code: 'GUARANTORS', outcome: 'FAIL' })).toBe(
      'loanEligibility.reason.GUARANTORS.FAIL'
    );
  });

  it('uses FAIL_INACTIVE for a failed membership-age rule with no limit', () => {
    expect(eligibilityReasonKey({ code: 'MEMBERSHIP_AGE', outcome: 'FAIL', limit: undefined })).toBe(
      'loanEligibility.reason.MEMBERSHIP_AGE.FAIL_INACTIVE'
    );
  });

  it('uses the normal key when a failed membership-age rule does have a limit', () => {
    expect(eligibilityReasonKey({ code: 'MEMBERSHIP_AGE', outcome: 'FAIL', limit: 3 })).toBe(
      'loanEligibility.reason.MEMBERSHIP_AGE.FAIL'
    );
  });

  it('never applies the inactive exception to a passed membership-age rule', () => {
    expect(eligibilityReasonKey({ code: 'MEMBERSHIP_AGE', outcome: 'PASS', limit: undefined })).toBe(
      'loanEligibility.reason.MEMBERSHIP_AGE.PASS'
    );
  });
});

describe('eligibilityReason', () => {
  it('passes the grouped limit and value to the translation', () => {
    const calls: Array<[
        string,
        Record<string, unknown> | undefined
      ]> = [];
    const translateFn = (key: string, params?: Record<string, unknown>) => {
      calls.push([
        key,
        params
      ]);
      return 'translated';
    };
    const text = eligibilityReason(
      { code: 'SINGLE_MEMBER_LIMIT', outcome: 'PASS', limit: 306000, value: 20000, reason: 'english' },
      translateFn
    );
    expect(text).toBe('translated');
    expect(calls).toEqual([[
        'loanEligibility.reason.SINGLE_MEMBER_LIMIT.PASS',
        { limit: '3,06,000', value: '20,000' }
      ]]);
  });

  it('falls back to the backend English reason when the key is missing', () => {
    const translateFn = (key: string) => key;
    const text = eligibilityReason(
      { code: 'KYM', outcome: 'NOT_CHECKED', limit: undefined, value: undefined, reason: 'backend reason' },
      translateFn
    );
    expect(text).toBe('backend reason');
  });

  it('leaves out limit and value from the params when they are not given', () => {
    const calls: Array<Record<string, unknown> | undefined> = [];
    const translateFn = (key: string, params?: Record<string, unknown>) => {
      calls.push(params);
      return 'translated';
    };
    eligibilityReason(
      { code: 'DIRECTOR', outcome: 'PASS', limit: undefined, value: undefined, reason: 'x' },
      translateFn
    );
    expect(calls[0]).toEqual({ limit: undefined, value: undefined });
  });
});
