/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** The public loan calculator's starting values and limits (fineract-dbug #242), in one place. */
export const LOAN_ESTIMATE = {
  amount: { start: 500000, min: 1000, max: 50000000 },
  ratePercent: { start: 13, min: 0, max: 30 },
  /** The period, in months: 1 month to 20 years */
  months: { startYears: 3, min: 1, max: 240 },
  /** Months between payments: every month, or every 3 months */
  monthsPerPayment: [
    1,
    3
  ]
} as const;
