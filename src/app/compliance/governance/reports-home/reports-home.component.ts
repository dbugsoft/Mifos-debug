/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { ComplianceService } from '../../compliance.service';
import { DueChipComponent } from '../../due-chip/due-chip.component';
import { InputDialogComponent, InputDialogData } from '../../input-dialog/input-dialog.component';
import { GovernanceService, REPORT_TYPES, ReportDue, ReportListItem, ReportType } from '../governance.service';

/**
 * Compliance › Reports (fineract-dbug #204): the yearly reports, what is due and by when, and starting one. Reports
 * hold counts only, so the board and the chief executive see this screen too.
 */
@Component({
  selector: 'mifosx-reports-home',
  templateUrl: './reports-home.component.html',
  styleUrls: ['../governance.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    AdToBsPipe,
    DueChipComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsHomeComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private governance = inject(GovernanceService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly allowed = signal<boolean | null>(null);
  readonly reports = signal<ReportListItem[]>([]);
  readonly due = signal<ReportDue[]>([]);
  readonly busy = signal(false);
  canPrepare = false;

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE', 'READ_AMLSUMMARY', 'READ_AMLDECISIONS'));
        this.canPrepare = this.compliance.can('MANAGE_AMLGOVERNANCE');
        if (this.allowed()) {
          this.governance.reports().subscribe((r) => {
            this.reports.set(r.reports);
            this.due.set(r.due);
          });
        }
      });
  }

  /** The fiscal year as the screens show it: 2082/83. */
  label(year: number): string {
    return year + '/' + String((year + 1) % 100).padStart(2, '0');
  }

  open(type: ReportType, fiscalYear: number): void {
    this.router.navigate([
      '/compliance',
      'reports',
      type.toLowerCase(),
      fiscalYear
    ]);
  }

  /** Starts (or opens) a due report: generating makes the draft. */
  start(d: ReportDue): void {
    if (d.status !== 'NOT_STARTED') {
      this.open(d.type, d.fiscalYear);
      return;
    }
    this.generate(d.type, d.fiscalYear);
  }

  /** Any report for any year. */
  prepare(): void {
    const year = this.due()[0]?.fiscalYear ?? new Date().getFullYear() + 56;
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data: {
          title: 'compliance.reports.Prepare a report',
          fields: [
            {
              name: 'type',
              label: 'compliance.reports.Report',
              type: 'select',
              required: true,
              value: 'SCHEDULE_3',
              options: REPORT_TYPES.map((t) => ({ value: t, label: 'compliance.reports.type.' + t }))
            },
            {
              name: 'year',
              label: 'compliance.reports.Fiscal year',
              type: 'select',
              required: true,
              value: String(year),
              options: [
                year + 1,
                year,
                year - 1,
                year - 2
              ].map((y) => ({ value: String(y), label: this.label(y) }))
            }
          ],
          confirm: 'compliance.reports.Prepare'
        },
        width: '480px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((r) => r && this.generate(r['type'] as ReportType, Number(r['year'])));
  }

  private generate(type: ReportType, fiscalYear: number): void {
    if (this.reports().some((x) => x.type === type && x.fiscalYear === fiscalYear)) {
      this.open(type, fiscalYear);
      return;
    }
    this.busy.set(true);
    this.governance.generate(type, fiscalYear).subscribe({
      next: () => this.open(type, fiscalYear),
      error: () => this.busy.set(false)
    });
  }
}
