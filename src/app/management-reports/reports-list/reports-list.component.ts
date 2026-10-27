/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { BS_MONTHS } from 'app/core/bs-calendar/bs-calendar.service';
import { ManagementReportsService } from '../management-reports.service';
import { Office, Period, REPORT_STATUSES, Report, ReportSummary } from '../management-reports.models';
import { statusChipClass } from '../management-reports.status';
import {
  CreateReportDialogComponent,
  CreateReportDialogData
} from './create-report-dialog/create-report-dialog.component';

/** The management reports register: period picker shortcuts, filters, and the list (fineract-dbug #142). */
@Component({
  selector: 'mifosx-reports-list',
  templateUrl: './reports-list.component.html',
  styleUrls: ['./reports-list.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsListComponent implements OnInit {
  private reportsService = inject(ManagementReportsService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  readonly reports = signal<ReportSummary[]>([]);
  readonly periods = signal<Period[]>([]);
  readonly offices = signal<Office[]>([]);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);

  readonly officeId = new FormControl<number | null>(null);
  readonly fiscalYear = new FormControl<number | null>(null);
  readonly status = new FormControl<string | null>(null);
  readonly statuses = REPORT_STATUSES;
  readonly statusChipClass = statusChipClass;

  ngOnInit(): void {
    this.reportsService.offices().subscribe((o) => this.offices.set(o));
    this.reportsService.periods().subscribe((p) => this.periods.set(p));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.reportsService
      .reports(this.officeId.value ?? undefined, this.fiscalYear.value ?? undefined, this.status.value ?? undefined)
      .subscribe({
        next: (r) => {
          this.reports.set(r);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadFailed.set(true);
        }
      });
  }

  open(r: ReportSummary): void {
    this.router.navigate([
      '/management-reports',
      r.id
    ]);
  }

  newReport(period?: Period): void {
    this.dialog
      .open<CreateReportDialogComponent, CreateReportDialogData, Report>(CreateReportDialogComponent, {
        data: { period, offices: this.offices() },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.router.navigate([
            '/management-reports',
            created.id
          ]);
        }
      });
  }

  periodButtonLabel(p: Period): string {
    if (p.kind === 'YEAR_TO_DATE') {
      return `${p.bsYear}/${(p.bsYear + 1).toString().slice(-2)}`;
    }
    if (p.kind === 'QUARTER') {
      return `Q${p.number} ${p.bsYear}`;
    }
    return `${BS_MONTHS[p.number - 1]} ${p.bsYear}`;
  }
}
