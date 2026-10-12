/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LoanEstimateInput, estimateLoan, groupNepali, nearestPeriods, parseNumber } from './loan-estimate';

const start = new Date(2026, 0, 31);
const loan = (overrides: Partial<LoanEstimateInput>) =>
  estimateLoan({
    principal: 500000,
    annualRatePercent: 13,
    months: 36,
    monthsPerPayment: 1,
    method: 'same',
    startDate: start,
    ...overrides
  })!;

/** Loan parts in paisa, so the sum is exact. */
const principalPaisa = (rows: { principalDue?: number }[]) =>
  rows.reduce((sum, r) => sum + Math.round((r.principalDue ?? 0) * 100), 0);

describe('estimateLoan', () => {
  it.each([
    [
      '5,00,000 at 13% for 36 months, same amount',
      {},
      11430.31,
      5416.67,
      16846.98,
      16846.77,
      106491.07,
      606491.07
    ],
    [
      '5,00,000 at 13% for 36 months, smaller each time',
      { method: 'smaller' },
      13888.89,
      5416.67,
      19305.56,
      14039.31,
      100208.33,
      600208.33
    ],
    [
      '2,00,000 at 12% for 2 years, every 3 months',
      { principal: 200000, annualRatePercent: 12, months: 24, monthsPerPayment: 3 },
      22491.28,
      6000,
      28491.28,
      28491.26,
      27930.22,
      227930.22
    ],
    [
      '1,00,000 at 0% for 12 months',
      { principal: 100000, annualRatePercent: 0, months: 12 },
      8333.33,
      0,
      8333.33,
      8333.37,
      0,
      100000
    ]
  ] as const)('%s', (_, overrides, firstPrincipal, firstInterest, first, last, interest, total) => {
    const e = loan(overrides as Partial<LoanEstimateInput>);
    expect(e.rows[0].principalDue).toBe(firstPrincipal);
    expect(e.rows[0].interestDue).toBe(firstInterest);
    expect(e.rows[0].totalDueForPeriod).toBe(first);
    expect(e.rows.at(-1)!.totalDueForPeriod).toBe(last);
    expect(e.totalInterest).toBe(interest);
    expect(e.totalRepayment).toBe(total);
    expect(e.rows.at(-1)!.principalLoanBalanceOutstanding).toBe(0);
    expect(principalPaisa(e.rows)).toBe(Math.round(e.totalPrincipal * 100));
  });

  it('works for one payment', () => {
    const e = loan({ months: 1 });
    expect(e.rows).toHaveLength(1);
    expect(e.rows[0].principalDue).toBe(500000);
    expect(e.rows[0].interestDue).toBe(5416.67);
  });

  it('works for 240 monthly payments and ends at 0.00', () => {
    const e = loan({ months: 240, method: 'smaller' });
    expect(e.rows).toHaveLength(240);
    expect(e.rows.at(-1)!.principalLoanBalanceOutstanding).toBe(0);
    expect(principalPaisa(e.rows)).toBe(50000000);
  });

  it('dates each payment on the start day, or the last day of a shorter month', () => {
    const e = loan({ months: 3 });
    expect(e.rows.map((r) => r.dueDate)).toEqual([
      [
        2026,
        2,
        28
      ],
      [
        2026,
        3,
        31
      ],
      [
        2026,
        4,
        30
      ]
    ]);
  });

  it('gives no schedule for a period that does not divide into the frequency, or a bad input', () => {
    expect(estimateLoan({ ...loanInput(), months: 10, monthsPerPayment: 3 })).toBeNull();
    expect(estimateLoan({ ...loanInput(), principal: 0 })).toBeNull();
    expect(estimateLoan({ ...loanInput(), annualRatePercent: NaN })).toBeNull();
  });
});

function loanInput(): LoanEstimateInput {
  return {
    principal: 500000,
    annualRatePercent: 13,
    months: 36,
    monthsPerPayment: 1,
    method: 'same',
    startDate: start
  };
}

describe('parseNumber, groupNepali and nearestPeriods', () => {
  it('reads commas, spaces and Nepali digits', () => {
    expect(parseNumber('५,००,०००')).toBe(500000);
    expect(parseNumber(' 5,00,000.50 ')).toBe(500000.5);
    expect(parseNumber('abc')).toBeNaN();
    expect(parseNumber('')).toBeNaN();
  });

  it('groups the Nepali way', () => {
    expect(groupNepali(50000000)).toBe('5,00,00,000');
  });

  it('suggests the nearest periods that divide into the frequency', () => {
    expect(nearestPeriods(10, 3)).toEqual([
      9,
      12
    ]);
    expect(nearestPeriods(2, 3)).toEqual([3]);
  });
});
