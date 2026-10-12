/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { Chart, registerables } from 'chart.js';
import { applyChartTheme } from 'app/shared/utils/chart-theme.util';
import { BsCalendarService } from 'app/core/bs-calendar/bs-calendar.service';
import { RepaymentSchedulePeriod } from 'app/loans/models/loan-account.model';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { DualDateComponent } from 'app/shared/dual-date/dual-date.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

Chart.register(...registerables);

/** One repayment, as Fineract's schedule gives it or as the public calculator works it out. */
export type ScheduleRow = Pick<
  RepaymentSchedulePeriod,
  'period' | 'dueDate' | 'principalDue' | 'interestDue' | 'totalDueForPeriod' | 'principalLoanBalanceOutstanding'
> & { feeChargesDue?: number };

export interface ScheduleTotals {
  principal: number;
  interest: number;
  /** Shown as a column only when given */
  fees?: number;
  repayment: number;
}

/** The translation keys of the column headings, so each calculator can use its own words. */
export interface ScheduleHeadings {
  principal: string;
  interest: string;
  due: string;
  balance: string;
}

const STAFF_HEADINGS: ScheduleHeadings = {
  principal: 'labels.inputs.Principal',
  interest: 'labels.inputs.Interest',
  due: 'labels.inputs.Due',
  balance: 'labels.inputs.Balance Of Loan'
};

/**
 * A repayment schedule: a chart of the loan and interest in each payment with the balance left, and the table of every
 * payment with its totals. Shared by the staff loan calculator and the public one (fineract-dbug #152, #242).
 */
@Component({
  selector: 'mifosx-loan-schedule',
  templateUrl: './loan-schedule.component.html',
  styleUrls: ['./loan-schedule.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTableModule,
    FormatNumberPipe,
    DualDateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanScheduleComponent implements OnChanges, OnDestroy {
  private translate = inject(TranslateService);
  private bsCalendar = inject(BsCalendarService);

  @Input({ required: true }) rows: ScheduleRow[] = [];
  @Input({ required: true }) totals!: ScheduleTotals;
  @Input() headings: ScheduleHeadings = STAFF_HEADINGS;
  @Input() printChart = true;

  private canvas: HTMLCanvasElement | null = null;
  private chart: { destroy(): void } | null = null;

  @ViewChild('balanceChart') set balanceChartCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.canvas = ref?.nativeElement ?? null;
    this.drawChart();
  }

  constructor() {
    // The chart's legend is text too.
    this.translate.onLangChange.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.drawChart());
  }

  get columns(): string[] {
    return [
      'period',
      'dueDate',
      'principal',
      'interest',
      ...(this.totals?.fees != null ? ['fees'] : []),
      'due',
      'balance'
    ];
  }

  ngOnChanges(): void {
    this.drawChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  /** Bars: loan and interest in each payment. Line: the balance left after it. */
  private drawChart(): void {
    this.chart?.destroy();
    this.chart = null;
    if (!this.canvas || !this.rows.length) {
      return;
    }
    const t = (key: string) => this.translate.instant(key);
    const style = getComputedStyle(this.canvas);
    const color = (token: string, fallback: string) => style.getPropertyValue(token).trim() || fallback;
    applyChartTheme();
    this.chart = new Chart(this.canvas, {
      type: 'bar',
      data: {
        labels: this.rows.map((p) => this.bsCalendar.formatIso(this.bsCalendar.toBs(p.dueDate)) ?? ''),
        datasets: [
          {
            type: 'line',
            label: t(this.headings.balance),
            data: this.rows.map((p) => p.principalLoanBalanceOutstanding),
            borderColor: color('--mat-sys-primary', '#2460b9'),
            backgroundColor: color('--mat-sys-primary', '#2460b9'),
            yAxisID: 'balance',
            pointRadius: this.rows.length > 60 ? 0 : 2,
            order: 0
          },
          {
            type: 'bar',
            label: t(this.headings.principal),
            data: this.rows.map((p) => p.principalDue ?? 0),
            backgroundColor: color('--mat-sys-tertiary', '#2e7d32'),
            stack: 'due',
            yAxisID: 'due',
            order: 1
          },
          {
            type: 'bar',
            label: t(this.headings.interest),
            data: this.rows.map((p) => p.interestDue ?? 0),
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
