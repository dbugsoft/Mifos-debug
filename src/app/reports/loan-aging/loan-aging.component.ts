/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
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
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateService } from '@ngx-translate/core';
import { Chart, registerables } from 'chart.js';
import { applyChartTheme } from 'app/shared/utils/chart-theme.util';
import { OrganizationService } from 'app/organization/organization.service';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

Chart.register(...registerables);

export type AgingGroupBy = 'BRANCH' | 'PRODUCT' | 'OFFICER' | 'CENTRE';

/** Shapes of GET /nepal/loan-aging (fineract-dbug, org.apache.fineract.nepal.loanaging). */
export interface AgingCell {
  loans: number;
  outstanding: number;
  overdue: number;
  provision: number;
}

export interface AgingBucket {
  code: string;
  label: string;
  minDaysOverdue: number;
  maxDaysOverdue: number | null;
  loanClass: string;
  provisionRate: number;
}

export interface LoanAgingReport {
  asOf: string;
  asOfBs: string;
  office: string;
  groupBy: AgingGroupBy;
  buckets: AgingBucket[];
  rows: { id: number | null; name: string; cells: AgingCell[]; total: AgingCell }[];
  bucketTotals: AgingCell[];
  total: AgingCell;
  classes: {
    code: string;
    label: string;
    provisionRate: number;
    loans: number;
    outstanding: number;
    provision: number;
  }[];
}

/** Query for GET /nepal/loan-aging; no officeId means the whole cooperative. */
export function agingParams(groupBy: AgingGroupBy, officeId: number | null): HttpParams {
  const params = new HttpParams().set('groupBy', groupBy);
  return officeId ? params.set('officeId', officeId) : params;
}

/** Overdue loans by age band for each branch, product, officer or centre, with loan class and provision. */
@Component({
  selector: 'mifosx-loan-aging',
  templateUrl: './loan-aging.component.html',
  styleUrls: ['./loan-aging.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FormsModule,
    MatButtonToggleModule,
    MatProgressBar,
    MatTableModule,
    FaIconComponent,
    FormatNumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanAgingComponent implements OnDestroy {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  readonly groupByOptions: { value: AgingGroupBy; label: string }[] = [
    { value: 'BRANCH', label: 'loanAging.Branch' },
    { value: 'PRODUCT', label: 'loanAging.Loan product' },
    { value: 'OFFICER', label: 'loanAging.Loan officer' },
    { value: 'CENTRE', label: 'loanAging.Centre' }
  ];

  offices: any[] = [];
  officeId: number | null = null;
  groupBy: AgingGroupBy = 'BRANCH';
  report: LoanAgingReport | null = null;
  columns: string[] = [];
  readonly classColumns = [
    'label',
    'provisionRate',
    'loans',
    'outstanding',
    'provision'
  ];
  loading = false;

  private chart: any = null;
  private canvas: HTMLCanvasElement | null = null;

  /** The canvas exists only once a report is shown, so the first chart is drawn when it appears. */
  @ViewChild('agingChart') set chartCanvas(canvas: ElementRef<HTMLCanvasElement> | undefined) {
    this.canvas = canvas?.nativeElement ?? null;
    if (this.canvas && this.report) {
      this.drawChart(this.canvas, this.report);
    }
  }

  constructor() {
    inject(OrganizationService)
      .getOffices()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((offices: any[]) => {
        this.offices = offices;
        this.cdr.markForCheck();
      });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http
      .get<LoanAgingReport>('/nepal/loan-aging', { params: this.params() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.report = report;
          this.columns = [
            'name',
            ...report.buckets.map((b) => b.code),
            'outstanding',
            'overdue',
            'provision'
          ];
          this.loading = false;
          if (this.canvas) {
            this.drawChart(this.canvas, report);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /** The backend builds the CSV and PDF, so they match the screen and the dashboard. */
  download(format: 'csv' | 'pdf'): void {
    this.http
      .get('/nepal/loan-aging', { params: this.params().set('format', format), responseType: 'blob' })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `loan-aging-${this.groupBy.toLowerCase()}-${this.report?.asOf ?? 'report'}.${format}`;
        anchor.click();
        // Revoking straight after click() can cancel the download in some browsers.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
  }

  /** Heading of the first column: what the report's rows are. */
  get groupByLabel(): string {
    return this.groupByOptions.find((o) => o.value === this.report?.groupBy)?.label ?? '';
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private params(): HttpParams {
    return agingParams(this.groupBy, this.officeId);
  }

  /** Outstanding and overdue in each age band, for the whole report. */
  private drawChart(canvas: HTMLCanvasElement, report: LoanAgingReport): void {
    this.chart?.destroy();
    const style = getComputedStyle(canvas);
    const color = (token: string, fallback: string) => style.getPropertyValue(token).trim() || fallback;
    applyChartTheme();
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: report.buckets.map((b) => b.label),
        datasets: [
          {
            label: this.translate.instant('loanAging.Outstanding'),
            data: report.bucketTotals.map((c) => c.outstanding),
            backgroundColor: color('--mat-sys-primary', '#2460b9')
          },
          {
            label: this.translate.instant('loanAging.Overdue'),
            data: report.bucketTotals.map((c) => c.overdue),
            backgroundColor: color('--mat-sys-error', '#c62828')
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}
