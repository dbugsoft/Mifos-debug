/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ComplianceService } from '../compliance.service';
import { GoamlReport, ReportType } from '../compliance.models';
import { GoamlReportListComponent } from './goaml-report-list.component';

const PAGE = 50;

/** Which reports the list shows: everything that reached FIU-Nepal, or one answer. */
export type SentFilter = 'REACHED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'CORRECTED' | 'DISCARDED';

/** The statuses behind each filter: "reached FIU-Nepal" is the counting rule of docs/goaml-reports.md. */
export const SENT_STATUSES: Record<SentFilter, string> = {
  REACHED: 'SUBMITTED,ACCEPTED,REJECTED,CORRECTED',
  SUBMITTED: 'SUBMITTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CORRECTED: 'CORRECTED',
  DISCARDED: 'DISCARDED'
};

/**
 * Every report sent, and what FIU-Nepal answered (fineract-dbug #291; ADR-0062): all three types in one record,
 * filtered by type and answer, newest first, a page at a time. The record an inspector asks to see.
 */
@Component({
  selector: 'mifosx-sent-reports',
  template: `
    <div class="compliance-page">
      <div class="filters">
        <mat-button-toggle-group
          [(ngModel)]="type"
          (change)="load(false)"
          [attr.aria-label]="'compliance.reports.Type' | translate"
        >
          <mat-button-toggle value="">{{ 'compliance.All' | translate }}</mat-button-toggle>
          @for (t of types; track t) {
            <mat-button-toggle [value]="t">{{ 'compliance.today.kind.' + t | translate }}</mat-button-toggle>
          }
        </mat-button-toggle-group>
        <mat-button-toggle-group
          [(ngModel)]="status"
          (change)="load(false)"
          [attr.aria-label]="'compliance.Status' | translate"
        >
          @for (s of statuses; track s) {
            <mat-button-toggle [value]="s">{{ 'compliance.reports.sent.' + s | translate }}</mat-button-toggle>
          }
        </mat-button-toggle-group>
      </div>
      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      <mifosx-goaml-report-list
        [reports]="reports()"
        [showType]="true"
        (changed)="load(false)"
      ></mifosx-goaml-report-list>
      @if (more()) {
        <button mat-button color="primary" type="button" (click)="load(true)">
          {{ 'compliance.reports.Show more' | translate }}
        </button>
      }
    </div>
  `,
  styleUrls: ['./suspicious-reports.component.scss'],
  styles: [
    `
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .filters mat-button-toggle-group {
        flex-wrap: wrap;
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FormsModule,
    MatButtonToggleModule,
    MatProgressBar,
    GoamlReportListComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SentReportsComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private destroyRef = inject(DestroyRef);

  readonly types: ReportType[] = [
    'TTR',
    'STR',
    'SAR'
  ];
  readonly statuses = Object.keys(SENT_STATUSES) as SentFilter[];
  type: ReportType | '' = '';
  status: SentFilter = 'REACHED';

  readonly loading = signal(true);
  readonly reports = signal<GoamlReport[]>([]);
  readonly more = signal(false);

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load(false));
  }

  load(next: boolean): void {
    this.loading.set(true);
    const offset = next ? this.reports().length : 0;
    this.compliance
      .goamlReports({ status: SENT_STATUSES[this.status], type: this.type || undefined, limit: PAGE, offset })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.reports.set(
            next ? [
                  ...this.reports(),
                  ...page
                ] : page
          );
          this.more.set(page.length === PAGE);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }
}
