/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Chart, registerables } from 'chart.js';
import { applyChartTheme } from 'app/shared/utils/chart-theme.util';
import { debounceTime, distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { ClientsService } from 'app/clients/clients.service';
import { BsCalendarService } from 'app/core/bs-calendar/bs-calendar.service';
import { Dates } from 'app/core/utils/dates';
import { LoansService } from 'app/loans/loans.service';
import { RepaymentSchedule, RepaymentSchedulePeriod } from 'app/loans/models/loan-account.model';
import { SettingsService } from 'app/settings/settings.service';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { DualDateComponent } from 'app/shared/dual-date/dual-date.component';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

Chart.register(...registerables);

/** Fineract charge time type "Specified due date": needs a due date the calculator does not ask for. */
const SPECIFIED_DUE_DATE = 2;

export interface CalculatorInputs {
  clientId: number;
  productId: number;
  principal: number;
  numberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: number;
  interestRatePerPeriod: number;
  /** Disbursement date, already formatted with `dateFormat`. */
  disbursementDate: string;
}

/**
 * The `calculateLoanSchedule` body: the member's inputs on top of the product defaults Fineract returned in the
 * loan template, so the schedule is the one this member would get if the loan were submitted today.
 */
export function buildSchedulePayload(
  template: any,
  inputs: CalculatorInputs,
  locale: string,
  dateFormat: string
): Record<string, unknown> {
  return {
    clientId: inputs.clientId,
    productId: inputs.productId,
    loanType: 'individual',
    principal: inputs.principal,
    // Fineract requires term = repayments × every, in the repayment frequency.
    loanTermFrequency: inputs.numberOfRepayments * inputs.repaymentEvery,
    loanTermFrequencyType: inputs.repaymentFrequencyType,
    numberOfRepayments: inputs.numberOfRepayments,
    repaymentEvery: inputs.repaymentEvery,
    repaymentFrequencyType: inputs.repaymentFrequencyType,
    interestRatePerPeriod: inputs.interestRatePerPeriod,
    amortizationType: template.amortizationType?.id,
    isEqualAmortization: template.isEqualAmortization,
    interestType: template.interestType?.id,
    interestCalculationPeriodType: template.interestCalculationPeriodType?.id,
    allowPartialPeriodInterestCalculation: template.allowPartialPeriodInterestCalculation,
    transactionProcessingStrategyCode: template.transactionProcessingStrategyCode,
    graceOnPrincipalPayment: template.graceOnPrincipalPayment,
    graceOnInterestPayment: template.graceOnInterestPayment,
    graceOnInterestCharged: template.graceOnInterestCharged,
    inArrearsTolerance: template.inArrearsTolerance,
    charges: (template.charges ?? [])
      .filter((charge: any) => charge.chargeTimeType?.id !== SPECIFIED_DUE_DATE)
      .map((charge: any) => ({ chargeId: charge.chargeId ?? charge.id, amount: charge.amount })),
    submittedOnDate: inputs.disbursementDate,
    expectedDisbursementDate: inputs.disbursementDate,
    locale,
    dateFormat
  };
}

/**
 * Loan repayment calculator: every repayment date, how the balance falls and when the loan ends, for a member and
 * a product. Uses Fineract's `calculateLoanSchedule`, so nothing is saved and the figures are Fineract's own.
 */
@Component({
  selector: 'mifosx-loan-calculator',
  templateUrl: './loan-calculator.component.html',
  styleUrls: ['./loan-calculator.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatAutocompleteModule,
    MatTableModule,
    FaIconComponent,
    FormatNumberPipe,
    DualDateComponent,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanCalculatorComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private loansService = inject(LoansService);
  private settingsService = inject(SettingsService);
  private bsCalendar = inject(BsCalendarService);
  private dateUtils = inject(Dates);
  private translate = inject(TranslateService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  @ViewChild('balanceChart') set balanceChartCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    if (ref) this.drawChart(ref.nativeElement);
  }

  readonly form = this.fb.group({
    // Typed text is not a member: only a picked search result (an object with an id) is.
    member: [
      null as any,
      (control: AbstractControl) => (control.value?.id ? null : { required: true })
    ],
    productId: [
      null as number | null,
      Validators.required
    ],
    principal: [
      null as number | null,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],
    numberOfRepayments: [
      null as number | null,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],
    repaymentEvery: [
      1,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],
    repaymentFrequencyType: [
      null as number | null,
      Validators.required
    ],
    interestRatePerPeriod: [
      null as number | null,
      [
        Validators.required,
        Validators.min(0)
      ]
    ],
    disbursementDate: [
      this.bsCalendar.todayInNepal(),
      Validators.required
    ]
  });

  memberOptions: any[] = [];
  productOptions: any[] = [];
  template: any = null;
  schedule: RepaymentSchedule | null = null;
  installments: RepaymentSchedulePeriod[] = [];
  readonly columns = [
    'period',
    'dueDate',
    'principal',
    'interest',
    'fees',
    'due',
    'balance'
  ];

  private chart: any = null;

  constructor() {
    this.form.controls.member.valueChanges
      .pipe(
        filter((value) => typeof value === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((text: string) =>
          text.trim().length < 2 ? of(null) : this.clientsService.searchByText(text, 0, 10)
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result: any) => {
        // Fineract only calculates for an active member.
        this.memberOptions = (result?.content ?? []).filter((c: any) => c.status?.code === 'clientStatusType.active');
        this.cdr.markForCheck();
      });

    // Any change to the inputs makes the shown schedule stale.
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.clearSchedule());
  }

  memberName(member: any): string {
    return member
      ? [
          member.displayName,
          member.accountNumber
        ]
          .filter(Boolean)
          .join(' · ')
      : '';
  }

  selectMember(member: any): void {
    this.productOptions = [];
    this.template = null;
    this.form.patchValue({ productId: null });
    this.loansService.getLoansAccountTemplateResource(member.id, false).subscribe((template: any) => {
      this.productOptions = template.productOptions ?? [];
      this.cdr.markForCheck();
    });
  }

  selectProduct(productId: number): void {
    this.template = null;
    this.loansService
      .getLoansAccountTemplateResource(this.form.value.member.id, false, productId)
      .subscribe((template: any) => {
        this.template = template;
        this.form.patchValue({
          principal: template.principal,
          numberOfRepayments: template.numberOfRepayments,
          repaymentEvery: template.repaymentEvery,
          repaymentFrequencyType: template.repaymentFrequencyType?.id,
          interestRatePerPeriod: template.interestRatePerPeriod
        });
        const overrides = template.product?.allowAttributeOverrides ?? {};
        for (const name of [
          'repaymentEvery',
          'repaymentFrequencyType'
        ] as const) {
          overrides.repaymentEvery === false ? this.form.controls[name].disable() : this.form.controls[name].enable();
        }
        this.cdr.markForCheck();
      });
  }

  calculate(): void {
    if (this.form.invalid || !this.template) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const dateFormat = this.settingsService.dateFormat;
    const payload = buildSchedulePayload(
      this.template,
      {
        clientId: value.member.id,
        productId: value.productId,
        principal: value.principal,
        numberOfRepayments: value.numberOfRepayments,
        repaymentEvery: value.repaymentEvery,
        repaymentFrequencyType: value.repaymentFrequencyType,
        interestRatePerPeriod: value.interestRatePerPeriod,
        disbursementDate: this.dateUtils.formatDate(value.disbursementDate, dateFormat)
      },
      this.settingsService.language.code,
      dateFormat
    );
    this.loansService.calculateLoanSchedule(payload).subscribe((schedule: RepaymentSchedule) => {
      this.schedule = schedule;
      // Period 0 (no number) is the disbursement row.
      this.installments = schedule.periods.filter((p) => p.period);
      this.cdr.markForCheck();
    });
  }

  get currencyCode(): string {
    return this.schedule?.currency?.code ?? this.template?.currency?.code ?? '';
  }

  get lastDueDate(): number[] | null {
    return this.installments.at(-1)?.dueDate ?? null;
  }

  print(): void {
    window.print();
  }

  /** Shares a short text summary (phone share sheet: Viber, WhatsApp, SMS), or copies it where sharing is not available. */
  async share(): Promise<void> {
    const text = this.summaryText();
    try {
      if (navigator.share) {
        await navigator.share({ title: this.translate.instant('labels.heading.Loan Calculator'), text });
      } else {
        await navigator.clipboard.writeText(text);
        this.snackBar.open(this.translate.instant('labels.text.Copied to clipboard'), undefined, { duration: 3000 });
      }
    } catch {
      // Share sheet dismissed: nothing to do.
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private summaryText(): string {
    const t = (key: string) => this.translate.instant(key);
    const money = (n: number) =>
      `${this.currencyCode} ${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const bs = (d: number[] | null) => this.bsCalendar.formatLong(this.bsCalendar.toBs(d));
    const first = this.installments[0];
    const s = this.schedule!;
    return [
      `${t('labels.heading.Loan Calculator')}: ${this.memberName(this.form.value.member)}`,
      `${t('labels.inputs.Principal')}: ${money(s.totalPrincipalExpected)}`,
      `${t('labels.inputs.Installment')}: ${money(first?.totalDueForPeriod)} × ${this.installments.length}`,
      `${t('labels.inputs.Total Interest')}: ${money(s.totalInterestCharged)}`,
      `${t('labels.inputs.Total Repayment')}: ${money(s.totalRepaymentExpected)}`,
      `${t('labels.inputs.First Repayment')}: ${bs(first?.dueDate ?? null)}`,
      `${t('labels.inputs.Last Repayment')}: ${bs(this.lastDueDate)}`
    ].join('\n');
  }

  private clearSchedule(): void {
    if (!this.schedule) return;
    this.schedule = null;
    this.installments = [];
    this.chart?.destroy();
    this.chart = null;
    this.cdr.markForCheck();
  }

  /** Bars: principal and interest in each repayment. Line: the balance left after it. */
  private drawChart(canvas: HTMLCanvasElement): void {
    this.chart?.destroy();
    const t = (key: string) => this.translate.instant(key);
    const style = getComputedStyle(canvas);
    const color = (token: string, fallback: string) => style.getPropertyValue(token).trim() || fallback;
    applyChartTheme();
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.installments.map((p) => this.bsCalendar.formatIso(this.bsCalendar.toBs(p.dueDate)) ?? ''),
        datasets: [
          {
            type: 'line',
            label: t('labels.inputs.Balance Of Loan'),
            data: this.installments.map((p) => p.principalLoanBalanceOutstanding),
            borderColor: color('--mat-sys-primary', '#2460b9'),
            backgroundColor: color('--mat-sys-primary', '#2460b9'),
            yAxisID: 'balance',
            pointRadius: 2,
            order: 0
          },
          {
            type: 'bar',
            label: t('labels.inputs.Principal'),
            data: this.installments.map((p) => p.principalDue ?? 0),
            backgroundColor: color('--mat-sys-tertiary', '#2e7d32'),
            stack: 'due',
            yAxisID: 'due',
            order: 1
          },
          {
            type: 'bar',
            label: t('labels.inputs.Interest'),
            data: this.installments.map((p: any) => p.interestDue ?? 0),
            backgroundColor: color('--mat-sys-secondary', '#f9a825'),
            stack: 'due',
            yAxisID: 'due',
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          due: { position: 'left', stacked: true, beginAtZero: true },
          balance: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } },
          x: { stacked: true, ticks: { maxRotation: 0, autoSkip: true } }
        }
      }
    });
  }
}
