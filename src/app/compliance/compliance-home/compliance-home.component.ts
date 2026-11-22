/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBar } from '@angular/material/progress-bar';
import { forkJoin, of, switchMap, catchError } from 'rxjs';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ComplianceService } from '../compliance.service';
import {
  AmlSettingsView,
  ComplianceAccess,
  KindCounts,
  LedgerStatus,
  TodayItem,
  TodayKind
} from '../compliance.models';
import { WorkingAsComponent } from '../officer/working-as.component';
import { DueChipComponent } from '../due-chip/due-chip.component';

/** Which lines the list shows: everything, or what a tile stands for. */
export type TodayFilter = 'ALL' | 'LATE' | 'SOON' | 'ALERTS';

/** The order kinds are named in a tile's breakdown. */
const KIND_ORDER: TodayKind[] = [
  'TTR',
  'STR',
  'SAR',
  'MATCH',
  'CONCERN',
  'ALERT',
  'CASE',
  'REVIEWS',
  'EDD_REVIEWS',
  'YEARLY',
  'DUTY'
];

/** How many lines show before "show all". */
const FIRST_LINES = 50;

/**
 * Today (fineract-dbug ADR 0060): everything waiting for the compliance officer in one list, soonest deadline first,
 * each line saying what to do next. Those who see counts only (the chief executive, the board) get the counts and the
 * officer's duties.
 */
@Component({
  selector: 'mifosx-compliance-home',
  templateUrl: './compliance-home.component.html',
  styleUrls: ['./compliance-home.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    FormatNumberPipe,
    AdToBsPipe,
    DueChipComponent,
    WorkingAsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComplianceHomeComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly loadingAll = signal(false);
  readonly access = signal<ComplianceAccess | null>(null);
  readonly settings = signal<AmlSettingsView | null>(null);
  readonly ledger = signal<LedgerStatus | null>(null);
  readonly filter = signal<TodayFilter>('ALL');
  readonly expanded = signal(false);

  /** The answer the sidebar shares, so the counts there and here are the same. */
  readonly today = this.compliance.todayAnswer;

  readonly lines = computed(() => {
    const items = this.today()?.items ?? [];
    switch (this.filter()) {
      case 'LATE':
        return items.filter((i) => i.daysLeft !== null && i.daysLeft < 0);
      case 'SOON':
        return items.filter((i) => i.daysLeft !== null && i.daysLeft >= 0 && i.daysLeft <= 3);
      case 'ALERTS':
        return items.filter((i) => i.kind === 'ALERT' || i.kind === 'CONCERN');
      default:
        return items;
    }
  });
  readonly shown = computed(() => (this.expanded() ? this.lines() : this.lines().slice(0, FIRST_LINES)));
  /** Lines not shown yet: those cut here and, for the whole list, those the server left out. */
  readonly hidden = computed(
    () => this.lines().length - this.shown().length + (this.filter() === 'ALL' ? (this.today()?.more ?? 0) : 0)
  );

  ngOnInit(): void {
    this.compliance
      .loadAccess(true)
      .pipe(
        switchMap((access) => {
          this.access.set(access);
          const can = (...p: string[]) => p.some((x) => access.permissions.includes(x));
          return forkJoin({
            today: access.showMenu ? this.compliance.loadToday() : of(null),
            settings: can('READ_AMLCOMPLIANCE', 'UPDATE_AMLSETTINGS')
              ? this.compliance.settings().pipe(catchError(() => of(null)))
              : of(null),
            ledger: can('READ_AMLCOMPLIANCE', 'UPDATE_AMLSETTINGS')
              ? this.compliance.ledgerStatus().pipe(catchError(() => of(null)))
              : of(null)
          });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        this.settings.set(data.settings);
        this.ledger.set(data.ledger);
        this.loading.set(false);
      });
  }

  can(...permissions: string[]): boolean {
    const a = this.access();
    return !!a && permissions.some((p) => a.permissions.includes(p));
  }

  /** A tile narrows the list to what it counts; pressed again, the whole list returns. */
  toggleFilter(f: TodayFilter): void {
    this.filter.set(this.filter() === f ? 'ALL' : f);
    this.expanded.set(false);
  }

  showAll(): void {
    this.expanded.set(true);
    if ((this.today()?.more ?? 0) > 0) {
      this.loadingAll.set(true);
      this.compliance
        .loadToday(5000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: () => this.loadingAll.set(false), error: () => this.loadingAll.set(false) });
    }
  }

  /** "3 TTR, 1 STR": the kinds behind a count, in a fixed order. */
  breakdown(counts: KindCounts | undefined): { kind: string; count: number }[] {
    if (!counts) {
      return [];
    }
    return KIND_ORDER.filter((k) => counts[k]).map((k) => ({ kind: k, count: counts[k] as number }));
  }

  /** What the line asks the officer to do, as a translation key and its values. */
  whatToDo(i: TodayItem): { key: string; params: Record<string, unknown> } {
    return whatToDo(i);
  }

  /** The second line under what to do, as a translation key or plain text: the rule, the case, the cash, the list. */
  subLine(i: TodayItem): string | null {
    switch (i.kind) {
      case 'ALERT':
        return 'compliance.alert.rule.' + i.detail;
      case 'STR':
      case 'SAR':
        return i.reference;
      case 'TTR':
        return i.detail === 'IN' || i.detail === 'OUT' ? 'compliance.today.direction.' + i.detail : null;
      case 'MATCH':
        return i.detail ? 'compliance.screening.source.' + i.detail : null;
      case 'YEARLY':
        return 'compliance.reports.type.' + i.detail;
      default:
        return null;
    }
  }

  /** Where the line's button goes. */
  link(i: TodayItem): { path: (string | number)[]; query?: Record<string, string> } {
    switch (i.kind) {
      case 'TTR':
        return i.action === 'DECIDE_LATE'
          ? { path: ['threshold-reports'], query: { status: 'HISTORICAL' } }
          : { path: ['threshold-reports'] };
      case 'STR':
      case 'SAR':
      case 'CASE':
        return { path: [
            'cases',
            i.caseId as number
          ] };
      case 'ALERT':
      case 'CONCERN':
        return { path: [
            'alerts',
            i.id as number
          ] };
      case 'MATCH':
        return { path: [
            'screening',
            'matches',
            i.id as number
          ] };
      case 'REVIEWS':
      case 'EDD_REVIEWS':
        return { path: ['risk'] };
      case 'YEARLY':
        return { path: [
            'reports',
            i.detail as string,
            i.id as number
          ] };
      default:
        return { path: ['governance'] };
    }
  }

  /** The button's verb. */
  button(i: TodayItem): string {
    return 'compliance.today.button.' + (i.kind === 'DUTY' || i.kind === 'YEARLY' ? 'OPEN' : i.action);
  }
}

/** What a line of Today asks the officer to do, as a translation key and its values (also used by the handover). */
export function whatToDo(i: TodayItem): { key: string; params: Record<string, unknown> } {
  const base = 'compliance.today.do.';
  switch (i.kind) {
    case 'DUTY':
      return { key: 'compliance.governance.prompt.' + i.detail, params: { date: i.dueOn ?? '' } };
    case 'YEARLY':
      return { key: base + 'YEARLY_' + i.action, params: { year: i.reference } };
    case 'ALERT':
    case 'REVIEWS':
    case 'EDD_REVIEWS':
    case 'CONCERN':
    case 'MATCH':
    case 'CASE':
      return { key: base + i.kind, params: { count: i.count, reference: i.reference } };
    default:
      return { key: base + i.action, params: { count: i.action === 'DECIDE_LATE' ? i.count : i.detail } };
  }
}
