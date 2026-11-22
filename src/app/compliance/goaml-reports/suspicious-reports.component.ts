/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatProgressBar } from '@angular/material/progress-bar';
import { forkJoin, of, switchMap } from 'rxjs';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ComplianceService } from '../compliance.service';
import { GoamlReport, ReportType, TodayItem } from '../compliance.models';
import { DueChipComponent } from '../due-chip/due-chip.component';
import { GoamlReportListComponent } from './goaml-report-list.component';
import { ReportStepsComponent, StepFilter } from './report-steps.component';

/** How many sent or accepted reports one page shows. */
const PAGE = 50;

/**
 * Suspicious transaction (STR) and suspicious activity (SAR) reports (ADR-0062): the cases decided as a report and not
 * made yet, then every report on its way, each on one tab with its rule and its steps. A report is made from its
 * case; this page shows them all in one place.
 */
@Component({
  selector: 'mifosx-suspicious-reports',
  templateUrl: './suspicious-reports.component.html',
  styleUrls: ['./suspicious-reports.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    AdToBsPipe,
    DueChipComponent,
    GoamlReportListComponent,
    ReportStepsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuspiciousReportsComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private destroyRef = inject(DestroyRef);

  readonly type: ReportType = (inject(ActivatedRoute).snapshot.data['type'] as ReportType) ?? 'STR';

  readonly loading = signal(true);
  readonly step = signal<StepFilter>('ALL');
  /** Drafts, ready and rejected reports of this type. */
  readonly waiting = signal<GoamlReport[]>([]);
  /** Sent or accepted reports, when that step is pressed. */
  readonly done = signal<GoamlReport[]>([]);
  readonly more = signal(false);

  /** Cases decided as this report, with no report made yet (from the Today answer). */
  readonly toMake = computed<TodayItem[]>(() =>
    (this.compliance.todayAnswer()?.items ?? []).filter((i) => i.kind === this.type && i.action === 'MAKE')
  );

  readonly shownReports = computed(() => {
    const all = this.waiting();
    switch (this.step()) {
      case 'NEEDS_FIXING':
        return all.filter((r) => !(r.status === 'READY' && !r.stale));
      case 'READY':
        return all.filter((r) => r.status === 'READY' && !r.stale);
      case 'SENT':
      case 'ACCEPTED':
        return this.done();
      case 'TO_MAKE':
        return [];
      default:
        return all;
    }
  });

  readonly showToMake = computed(() => this.step() === 'ALL' || this.step() === 'TO_MAKE');

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      steps: this.compliance.loadReportSteps(),
      waiting: this.compliance.goamlReports({ status: 'DRAFT,READY,REJECTED', type: this.type }),
      today: this.compliance.loadToday().pipe(
        // the list holds 300 lines; a busy cooperative's cases to report may be past them
        switchMap((t) => (t && t.more > 0 ? this.compliance.loadToday(5000) : of(t)))
      )
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ waiting }) => {
        // soonest deadline first, as on Today
        this.waiting.set([...waiting].sort((a, b) => (a.dueOn ?? '9').localeCompare(b.dueOn ?? '9')));
        this.loading.set(false);
        if (this.step() === 'SENT' || this.step() === 'ACCEPTED') {
          this.loadDone(false);
        }
      });
  }

  onStep(step: StepFilter): void {
    this.step.set(step);
    if (step === 'SENT' || step === 'ACCEPTED') {
      this.loadDone(false);
    }
  }

  /** Sent or accepted reports, newest first, a page at a time. */
  loadDone(next: boolean): void {
    const offset = next ? this.done().length : 0;
    this.compliance
      .goamlReports({
        status: this.step() === 'SENT' ? 'SUBMITTED' : 'ACCEPTED',
        type: this.type,
        limit: PAGE,
        offset
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => {
        this.done.set(
          next ? [
                ...this.done(),
                ...page
              ] : page
        );
        this.more.set(page.length === PAGE);
      });
  }

  /** After a step on a report; reloading also renews the counts in the menu and on the tabs. */
  changed(): void {
    this.load();
  }
}
