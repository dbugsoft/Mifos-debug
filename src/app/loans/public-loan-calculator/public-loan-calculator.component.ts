/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors } from '@angular/forms';
import { ErrorStateMatcher, ShowOnDirtyErrorStateMatcher } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateService } from '@ngx-translate/core';
import { getCoopConfig, resolveCoop } from 'environments/coop-config';
import { BsCalendarService } from 'app/core/bs-calendar/bs-calendar.service';
import { DualDateComponent } from 'app/shared/dual-date/dual-date.component';
import { LanguageSelectorComponent } from 'app/shared/language-selector/language-selector.component';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { ThemeToggleComponent } from 'app/shared/theme-toggle/theme-toggle.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanScheduleComponent, ScheduleHeadings, ScheduleTotals } from '../loan-schedule/loan-schedule.component';
import { LOAN_ESTIMATE } from './loan-estimate.constants';
import { RepaymentMethod, estimateLoan, groupNepali, nearestPeriods, parseNumber } from './loan-estimate';

const T = 'publicCalculator.';

/** Rs 16,846.98: always two decimals, grouped the Nepali way. */
function money(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function inRange(min: number, max: number, decimals = 2) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = parseNumber(control.value);
    const tooPrecise = Math.round(value * 10 ** decimals) !== value * 10 ** decimals;
    return isFinite(value) && value >= min && value <= max && !tooPrecise ? null : { range: true };
  };
}

/**
 * The public loan calculator (fineract-dbug #242): anyone, signed in or not, types an amount, a yearly rate and a
 * period and sees about what they would pay. Everything is worked out in the browser by {@link estimateLoan}; the
 * page asks the server for nothing.
 */
@Component({
  selector: 'mifosx-public-loan-calculator',
  templateUrl: './public-loan-calculator.component.html',
  styleUrls: ['./public-loan-calculator.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatButtonModule,
    MatRadioModule,
    FaIconComponent,
    DualDateComponent,
    LanguageSelectorComponent,
    NepaliDateInputComponent,
    ThemeToggleComponent,
    LoanScheduleComponent
  ],
  // Errors show while typing, not only after leaving the field.
  providers: [{ provide: ErrorStateMatcher, useClass: ShowOnDirtyErrorStateMatcher }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicLoanCalculatorComponent {
  private fb = inject(FormBuilder);
  private bsCalendar = inject(BsCalendarService);
  private translate = inject(TranslateService);
  private snackBar = inject(MatSnackBar);

  readonly limits = LOAN_ESTIMATE;
  /** The cooperative of this address, or null on an address that maps to none (the app name shows instead). */
  readonly coopName = resolveCoop(window.location.hostname).matched ? getCoopConfig().coopName : null;
  readonly headings: ScheduleHeadings = {
    principal: T + 'Loan amount paid',
    interest: T + 'Interest',
    due: T + 'Payment',
    balance: T + 'Left to pay'
  };

  readonly form = this.fb.group(
    {
      amount: [
        groupNepali(LOAN_ESTIMATE.amount.start),
        inRange(LOAN_ESTIMATE.amount.min, LOAN_ESTIMATE.amount.max)
      ],
      rate: [
        String(LOAN_ESTIMATE.ratePercent.start),
        inRange(LOAN_ESTIMATE.ratePercent.min, LOAN_ESTIMATE.ratePercent.max)
      ],
      years: [LOAN_ESTIMATE.months.startYears as number | null],
      months: [0 as number | null],
      monthsPerPayment: [LOAN_ESTIMATE.monthsPerPayment[0] as number],
      method: ['same' as RepaymentMethod],
      startDate: [this.bsCalendar.todayInNepal()]
    },
    { validators: (group) => this.periodError(group) }
  );

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  readonly moreOptions = signal(false);
  /** Open at first on a laptop, closed on a phone. */
  readonly scheduleOpen = signal(window.innerWidth > 768);

  readonly totalMonths = computed(() => this.monthsOf(this.value()));

  readonly estimate = computed(() => {
    const v = this.value();
    if (this.form.invalid) {
      return null;
    }
    return estimateLoan({
      principal: parseNumber(v.amount),
      annualRatePercent: parseNumber(v.rate),
      months: this.totalMonths(),
      monthsPerPayment: v.monthsPerPayment ?? 1,
      method: v.method ?? 'same',
      startDate: v.startDate ?? new Date(NaN)
    });
  });

  readonly totals = computed<ScheduleTotals | null>(() => {
    const e = this.estimate();
    return e ? { principal: e.totalPrincipal, interest: e.totalInterest, repayment: e.totalRepayment } : null;
  });

  /** The answer in words: "You pay about Rs 16,846.98 every month". */
  readonly answer = computed(() => {
    const e = this.estimate();
    if (!e) {
      return null;
    }
    const every = this.value().monthsPerPayment === 3 ? 'Quarter' : 'Month';
    return this.value().method === 'smaller'
      ? {
          key: `${T}answerSmaller${every}`,
          params: { first: money(e.rows[0].totalDueForPeriod), last: money(e.rows.at(-1)!.totalDueForPeriod) }
        }
      : { key: `${T}answerSame${every}`, params: { amount: money(e.rows[0].totalDueForPeriod) } };
  });

  /** The share of what is paid back that is interest, for the picture. */
  readonly interestPercent = computed(() => {
    const e = this.estimate();
    return e && e.totalRepayment > 0 ? Math.round((e.totalInterest / e.totalRepayment) * 1000) / 10 : 0;
  });

  readonly money = money;

  /** Re-groups the amount as it is typed (5,00,000), keeping the cursor after the same digit. */
  groupAmount(input: HTMLInputElement): void {
    const value = parseNumber(input.value);
    if (!isFinite(value) || /\.\d{0,1}$/.test(input.value)) {
      return; // leave a half-typed number or decimal as it is
    }
    const digitsBefore = input.value
      .slice(0, input.selectionStart ?? input.value.length)
      .replace(/[^\d०-९.]/g, '').length;
    const grouped = groupNepali(value);
    this.form.controls.amount.setValue(grouped);
    let caret = 0;
    for (let seen = 0; caret < grouped.length && seen < digitsBefore; caret++) {
      if (grouped[caret] !== ',') seen++;
    }
    input.setSelectionRange(caret, caret);
  }

  /** "Try 9 or 12 months": the nearest periods that divide into the payment frequency. */
  periodSuggestions(): string {
    const v = this.value();
    return nearestPeriods(this.totalMonths(), v.monthsPerPayment ?? 1).join(' / ');
  }

  print(): void {
    window.print();
  }

  /** Shares a short summary (phone share sheet), or copies it where sharing is not available. */
  async share(): Promise<void> {
    const text = this.summaryText();
    try {
      if (navigator.share) {
        await navigator.share({ title: this.translate.instant(T + 'Loan calculator'), text });
      } else {
        await navigator.clipboard.writeText(text);
        this.snackBar.open(this.translate.instant('labels.text.Copied to clipboard'), undefined, { duration: 3000 });
      }
    } catch {
      // Share sheet dismissed: nothing to do.
    }
  }

  /** The inputs in one line, for print and share. */
  inputsSummary(): string {
    const v = this.value();
    const t = (key: string, params?: object) => this.translate.instant(T + key, params);
    return t('inputsSummary', {
      amount: groupNepali(parseNumber(v.amount)),
      rate: parseNumber(v.rate),
      months: this.totalMonths(),
      every: t(v.monthsPerPayment === 3 ? 'Every 3 months' : 'Every month').toLowerCase(),
      method: t(v.method === 'smaller' ? 'Smaller amount each time' : 'Same amount every time').toLowerCase()
    });
  }

  private summaryText(): string {
    const e = this.estimate()!;
    const answer = this.answer()!;
    const t = (key: string) => this.translate.instant(T + key);
    const last = this.bsCalendar.formatLong(this.bsCalendar.toBs(e.rows.at(-1)!.dueDate));
    return [
      t('Loan calculator'),
      this.inputsSummary(),
      this.translate.instant(answer.key, answer.params),
      `${t('Total interest')}: ${t('Rs')} ${money(e.totalInterest)}`,
      `${t('Total you pay back')}: ${t('Rs')} ${money(e.totalRepayment)}`,
      `${t('Last payment')}: ${last}`,
      t('estimateNote')
    ].join('\n');
  }

  private monthsOf(v: { years?: number | null; months?: number | null }): number {
    return Number(v.years || 0) * 12 + Number(v.months || 0);
  }

  /** 1 month to 20 years, whole years and months, and a period the payment frequency divides into. */
  private periodError(group: AbstractControl): ValidationErrors | null {
    const v = group.value;
    const whole = (n: unknown) => n == null || n === '' || (Number.isInteger(Number(n)) && Number(n) >= 0);
    const months = this.monthsOf(v);
    if (!whole(v.years) || !whole(v.months) || months < LOAN_ESTIMATE.months.min || months > LOAN_ESTIMATE.months.max) {
      return { periodRange: true };
    }
    return months % (v.monthsPerPayment ?? 1) ? { periodNotDivisible: true } : null;
  }
}
