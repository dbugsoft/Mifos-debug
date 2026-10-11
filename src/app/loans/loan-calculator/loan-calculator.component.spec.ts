/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { buildSchedulePayload } from './loan-calculator.component';

describe('buildSchedulePayload', () => {
  const template = {
    amortizationType: { id: 1 },
    interestType: { id: 0 },
    interestCalculationPeriodType: { id: 1 },
    transactionProcessingStrategyCode: 'mifos-standard-strategy',
    isEqualAmortization: false,
    charges: [
      { chargeId: 4, amount: 100, chargeTimeType: { id: 1 } },
      { chargeId: 5, amount: 50, chargeTimeType: { id: 2 } }
    ]
  };
  const payload = buildSchedulePayload(
    template,
    {
      clientId: 7,
      productId: 3,
      principal: 100000,
      numberOfRepayments: 12,
      repaymentEvery: 2,
      repaymentFrequencyType: 2,
      interestRatePerPeriod: 13,
      disbursementDate: '04 October 2026'
    },
    'en',
    'dd MMMM yyyy'
  );

  it('sets the loan term to repayments × every, in the repayment frequency, as Fineract requires', () => {
    expect(payload['loanTermFrequency']).toBe(24);
    expect(payload['loanTermFrequencyType']).toBe(2);
  });

  it("takes the member's inputs and the product's defaults", () => {
    expect(payload).toMatchObject({
      clientId: 7,
      productId: 3,
      loanType: 'individual',
      principal: 100000,
      interestRatePerPeriod: 13,
      amortizationType: 1,
      interestType: 0,
      transactionProcessingStrategyCode: 'mifos-standard-strategy',
      submittedOnDate: '04 October 2026',
      expectedDisbursementDate: '04 October 2026',
      locale: 'en',
      dateFormat: 'dd MMMM yyyy'
    });
  });

  it('leaves out charges that need a specified due date', () => {
    expect(payload['charges']).toEqual([{ chargeId: 4, amount: 100 }]);
  });
});
