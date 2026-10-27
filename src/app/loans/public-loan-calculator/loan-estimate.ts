/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { ScheduleRow } from '../loan-schedule/loan-schedule.component';

/**
 * The public loan calculator's arithmetic (fineract-dbug #242), with no Angular and no server: interest on the amount
 * still owed, a yearly rate, payments every month or every 3 months. It copies how the cooperatives' loan products are
 * set up, so the figures are an estimate of what Fineract would schedule, without fees.
 */

/** Same amount every time (equal installments), or the loan split equally with interest on what is left. */
export type RepaymentMethod = 'same' | 'smaller';

export interface LoanEstimateInput {
  principal: number;
  annualRatePercent: number;
  months: number;
  monthsPerPayment: number;
  method: RepaymentMethod;
  startDate: Date;
}

export interface LoanEstimate {
  rows: ScheduleRow[];
  totalPrincipal: number;
  totalInterest: number;
  totalRepayment: number;
}

/** The schedule, or null when the period does not divide into the payment frequency or an input is out of range. */
export function estimateLoan(input: LoanEstimateInput): LoanEstimate | null {
  const { annualRatePercent, months, monthsPerPayment, method, startDate } = input;
  const n = months / monthsPerPayment;
  const principal = Math.round(input.principal * 100); // paisa from here on, so no floating point leftovers
  if (!Number.isInteger(n) || n < 1 || principal < 1 || !(annualRatePercent >= 0) || isNaN(startDate?.getTime())) {
    return null;
  }
  const i = (annualRatePercent / 100 / 12) * monthsPerPayment;
  const equalPayment = i === 0 ? Math.round(principal / n) : Math.round((principal * i) / (1 - Math.pow(1 + i, -n)));
  const equalPrincipal = Math.round(principal / n);

  const rows: ScheduleRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  for (let period = 1; period <= n; period++) {
    const interest = Math.round(balance * i);
    const last = period === n;
    const principalPart = last ? balance : method === 'same' ? equalPayment - interest : equalPrincipal;
    balance -= principalPart;
    totalInterest += interest;
    rows.push({
      period,
      dueDate: addMonths(startDate, period * monthsPerPayment),
      principalDue: principalPart / 100,
      interestDue: interest / 100,
      totalDueForPeriod: (principalPart + interest) / 100,
      principalLoanBalanceOutstanding: balance / 100
    });
  }
  return {
    rows,
    totalPrincipal: principal / 100,
    totalInterest: totalInterest / 100,
    totalRepayment: (principal + totalInterest) / 100
  };
}

/** [year, month, day] in AD, the same day of the month as the start; a start on the 31st uses shorter months' last day. */
function addMonths(start: Date, months: number): number[] {
  const index = start.getFullYear() * 12 + start.getMonth() + months;
  const year = Math.floor(index / 12);
  const month = index % 12;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [
    year,
    month + 1,
    Math.min(start.getDate(), daysInMonth)
  ];
}

/** A typed or pasted number: commas, spaces and Nepali digits (५,००,०००) are understood. NaN when it is not a number. */
export function parseNumber(text: string | number | null | undefined): number {
  if (typeof text === 'number') {
    return text;
  }
  const plain = (text ?? '').replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966)).replace(/[,\s]/g, '');
  return plain === '' || !/^\d*\.?\d*$/.test(plain) ? NaN : Number(plain);
}

/** Digits grouped the Nepali way: 5,00,000. */
export function groupNepali(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** The nearest periods, in months, that divide into the payment frequency: one shorter (if any) and one longer. */
export function nearestPeriods(months: number, monthsPerPayment: number): number[] {
  const shorter = Math.floor(months / monthsPerPayment) * monthsPerPayment;
  return [
    shorter,
    shorter + monthsPerPayment
  ].filter((m) => m > 0);
}
