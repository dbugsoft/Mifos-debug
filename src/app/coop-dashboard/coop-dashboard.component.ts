/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BS_MONTHS } from 'app/core/bs-calendar/bs-calendar.service';
import { DualDateComponent } from 'app/shared/dual-date/dual-date.component';
import {
  Actions,
  Capital,
  DashPeriod,
  Filters,
  GenderCounts,
  Income,
  LoanClassCode,
  Loans,
  Membership,
  Pearls,
  Savings,
  SectionName,
  SectionState,
  Summary
} from './coop-dashboard.models';
import { CoopDashboardService } from './coop-dashboard.service';
import { change, grouped, percent, shortAmount } from './coop-format';
import { ActionListComponent } from './widgets/action-list.component';
import { AreaTableComponent } from './widgets/area-table.component';
import { InfoTipComponent } from './widgets/info-tip.component';
import { PearlsCardComponent } from './widgets/pearls-card.component';
import { ChartSeries, CoopChartComponent } from './widgets/coop-chart.component';
import { KpiTileComponent, TileChange } from './widgets/kpi-tile.component';

type Sections = {
  summary: SectionState<Summary>;
  membership: SectionState<Membership>;
  savings: SectionState<Savings>;
  loans: SectionState<Loans>;
  capital: SectionState<Capital>;
  income: SectionState<Income>;
  actions: SectionState<Actions>;
  pearls: SectionState<Pearls>;
};

const SECTIONS: SectionName[] = [
  'summary',
  'loans',
  'actions',
  'savings',
  'membership',
  'income',
  'capital',
  'pearls'
];
const AD_MONTH = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * The cooperative dashboard (fineract-dbug ADR 0021): headline figures, loan quality in NCRA classes, what needs doing,
 * savings and loan flows by BS month, membership, income and capital, for an office and a BS fiscal year.
 */
@Component({
  selector: 'mifosx-coop-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    FaIconComponent,
    TranslatePipe,
    DualDateComponent,
    KpiTileComponent,
    CoopChartComponent,
    ActionListComponent,
    AreaTableComponent,
    InfoTipComponent,
    PearlsCardComponent,
    NgTemplateOutlet
  ],
  templateUrl: './coop-dashboard.component.html',
  styleUrl: './coop-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoopDashboardComponent implements OnInit {
  private service = inject(CoopDashboardService);
  private translate = inject(TranslateService);

  readonly filters = signal<Filters | null>(null);
  readonly officeId = signal<number | null>(null);
  readonly fiscalYear = signal<number | null>(null);
  readonly s = signal<Sections>(this.blank());

  readonly period = computed<DashPeriod | null>(
    () => this.s().summary.data?.period ?? this.s().loans.data?.period ?? this.s().savings.data?.period ?? null
  );
  /** Months of the fiscal year shown in charts: those started so far (all twelve for a past year). */
  readonly shownMonths = computed(() => {
    const p = this.period();
    return p ? Math.max(1, p.months.filter((m) => m.start <= p.asOf).length) : 12;
  });
  /** BS month names for the fiscal year's months, and their AD dates for tooltips. */
  readonly monthLabels = computed(
    () =>
      this.period()
        ?.months.slice(0, this.shownMonths())
        .map((m) => BS_MONTHS[m.bsMonth - 1]) ?? []
  );
  readonly monthNotes = computed(
    () =>
      this.period()
        ?.months.slice(0, this.shownMonths())
        .map((m) => `${m.bsYear} · ${AD_MONTH.format(new Date(m.start))} – ${AD_MONTH.format(new Date(m.end))}`) ?? []
  );
  /** Labels for the twelve-month trend lines on the headline tiles. */
  private readonly allMonthLabels = computed(() => this.period()?.months.map((m) => BS_MONTHS[m.bsMonth - 1]) ?? []);

  ngOnInit(): void {
    this.service.filters().subscribe({
      next: (f) => {
        this.filters.set(f);
        this.fiscalYear.set(f.currentFiscalYear);
        this.load();
      },
      error: () => this.load()
    });
  }

  load(): void {
    for (const name of SECTIONS) this.loadSection(name);
  }

  loadSection(name: SectionName): void {
    this.patch(name, { loading: true, error: false });
    this.service.section<any>(name, this.officeId(), this.fiscalYear()).subscribe({
      next: (data) => this.patch(name, { loading: false, error: false, data }),
      error: () => this.patch(name, { loading: false, error: true, data: null })
    });
  }

  onOffice(id: number): void {
    // 0 is "all offices": the user's own office and everything under it.
    this.officeId.set(id || null);
    this.load();
  }

  onYear(year: number): void {
    this.fiscalYear.set(year);
    this.load();
  }

  // ── Headline tiles ──────────────────────────────────────────────────────

  trendChange(t: { value: number; previous: number | null } | undefined, goodWhenUp = true): TileChange | null {
    const c = change(t?.value, t?.previous);
    return c == null ? null : { value: c, goodWhenUp };
  }

  spark(values: (number | null)[] | undefined, kind: 'amount' | 'count') {
    return values
      ? {
          values,
          labels: this.allMonthLabels(),
          format: (v: number) => (kind === 'count' ? grouped(v) : 'NPR ' + shortAmount(v))
        }
      : null;
  }

  parStatus(par: number | null | undefined): 'good' | 'warning' | 'critical' | null {
    if (par == null) return null;
    return par < 5 ? 'good' : par < 10 ? 'warning' : 'critical';
  }

  // ── Loan quality ────────────────────────────────────────────────────────

  classShare(outstanding: number): number {
    const total = this.s().loans.data?.outstanding || 0;
    return total ? (outstanding / total) * 100 : 0;
  }

  classDays(min: number, max: number | null): string {
    return max == null ? `${min}+` : min === 0 ? `0–${max}` : `${min}–${max}`;
  }

  readonly classIcon: Record<LoanClassCode, string> = {
    PASS: 'check-circle',
    SUBSTANDARD: 'exclamation-circle',
    DOUBTFUL: 'exclamation-circle',
    LOSS: 'times-circle'
  };

  // ── Charts ──────────────────────────────────────────────────────────────

  series(...pairs: [
      string,
      (number | null)[] | undefined
    ][]): ChartSeries[] {
    return pairs.map(
      ([
          name,
          data
        ], i) => ({
        name: this.translate.instant('coopDashboard.' + name),
        data: data ?? [],
        slot: (i + 1) as 1 | 2 | 3
      })
    );
  }

  /** Monthly series for the months shown. */
  monthly(...pairs: [
      string,
      (number | null)[] | undefined
    ][]): ChartSeries[] {
    return this.series(
      ...pairs.map(
        ([
          name,
          data
        ]) => [
            name,
            data?.slice(0, this.shownMonths())
          ] as [
            string,
            (number | null)[] | undefined
          ]
      )
    );
  }

  /** Male, female, and other when anyone is recorded as other. */
  private genderSeries(counts: GenderCounts[]): ChartSeries[] {
    const pairs: [
      string,
      number[]
    ][] = [
      [
        'Male',
        counts.map((c) => c.male)
      ],
      [
        'Female',
        counts.map((c) => c.female)
      ]
    ];
    if (counts.some((c) => c.other > 0))
      pairs.push([
        'Other',
        counts.map((c) => c.other)
      ]);
    return this.series(...pairs);
  }

  joinsSeries(m: Membership | null): ChartSeries[] {
    return this.genderSeries((m?.joinsByFiscalYear.slice(-10) ?? []).map((y) => y.members));
  }

  joinsLabels(m: Membership | null): string[] {
    return m?.joinsByFiscalYear.slice(-10).map((y) => y.label) ?? [];
  }

  ageSeries(m: Membership | null): ChartSeries[] {
    return this.genderSeries((m?.ageBands ?? []).map((b) => b.members));
  }

  ageLabels(m: Membership | null): string[] {
    return m?.ageBands.map((b) => b.band) ?? [];
  }

  single(name: string, values: number[]): ChartSeries[] {
    return [{ name: this.translate.instant('coopDashboard.' + name), data: values, slot: 1 }];
  }

  productLabels(sv: Savings | null): string[] {
    return sv?.byProduct.filter((p) => p.balance > 1000).map((p) => p.name) ?? [];
  }

  productValues(sv: Savings | null): number[] {
    return sv?.byProduct.filter((p) => p.balance > 1000).map((p) => p.balance) ?? [];
  }

  purposeLabels(l: Loans | null): string[] {
    return l?.byPurpose.map((p) => p.label) ?? [];
  }

  purposeValues(l: Loans | null): number[] {
    return l?.byPurpose.map((p) => p.amount) ?? [];
  }

  incomeLines(i: Income | null, type: 'INCOME' | 'EXPENSE') {
    return i?.lines.filter((l) => l.type === type && Math.abs(l.amount) >= 1) ?? [];
  }

  /** Where the spread and the cap sit on a gauge that runs a third past the cap. */
  spreadGauge(spread: number | null, cap: number): { value: number; cap: number } {
    const top = Math.max(cap * 1.34, (spread ?? 0) * 1.1, 1);
    return { value: Math.max(0, Math.min(100, ((spread ?? 0) / top) * 100)), cap: (cap / top) * 100 };
  }

  lineShare(amount: number, total: number): number {
    return total ? Math.max(2, (Math.abs(amount) / Math.abs(total)) * 100) : 0;
  }

  private patch(name: SectionName, state: Partial<SectionState<any>>): void {
    this.s.update((all) => ({ ...all, [name]: { ...all[name as keyof Sections], ...state } }));
  }

  private blank(): Sections {
    const empty: SectionState<any> = { loading: true, error: false, data: null };
    return {
      summary: { ...empty },
      membership: { ...empty },
      savings: { ...empty },
      loans: { ...empty },
      capital: { ...empty },
      income: { ...empty },
      actions: { ...empty },
      pearls: { ...empty }
    };
  }

  readonly short = shortAmount;
  readonly grouped = grouped;
  readonly percent = percent;
}
