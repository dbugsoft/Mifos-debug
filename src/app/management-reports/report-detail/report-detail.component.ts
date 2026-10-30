/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { InputDialogComponent, InputDialogData } from 'app/compliance/input-dialog/input-dialog.component';
import { PearlsCardComponent } from 'app/coop-dashboard/widgets/pearls-card.component';
import { Pearls as DashboardPearls } from 'app/coop-dashboard/coop-dashboard.models';
import { grouped, percent } from 'app/coop-dashboard/coop-format';
import { getCoopConfig } from 'environments/coop-config';
import { ManagementReportsService } from '../management-reports.service';
import { statusChipClass } from '../management-reports.status';
import { DISCARDABLE_STATUSES, Office, Report, ReportContent } from '../management-reports.models';
import {
  CreateReportDialogComponent,
  CreateReportDialogData
} from '../reports-list/create-report-dialog/create-report-dialog.component';
import { ApproveDialogComponent, ApproveDialogData } from './approve-dialog/approve-dialog.component';

/** One management report: its sealed content, section by section, and the state-machine actions (fineract-dbug #142). */
@Component({
  selector: 'mifosx-report-detail',
  templateUrl: './report-detail.component.html',
  styleUrls: ['./report-detail.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    PearlsCardComponent,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reportsService = inject(ManagementReportsService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  readonly report = signal<Report | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly offices = signal<Office[]>([]);
  readonly statusChipClass = statusChipClass;
  readonly grouped = grouped;
  readonly percent = percent;

  readonly notes = new FormControl('', Validators.maxLength(8000));
  readonly savingNotes = signal(false);

  readonly sealedContent = signal<string | null>(null);
  readonly loadingSealedContent = signal(false);
  readonly showSealedContent = signal(false);

  readonly printContent = signal<ReportContent | null>(null);
  readonly loadingPrint = signal(false);
  readonly coopName = getCoopConfig().coopName;

  readonly canEditNotes = computed(() => {
    const r = this.report();
    return !!r && DISCARDABLE_STATUSES.includes(r.status);
  });

  // Not a computed(): it reads notes.value, a plain FormControl property rather than a signal, so a computed()
  // here would cache its first result and never notice further typing. A plain method re-evaluates on every
  // change-detection pass instead - which typing already triggers, since it's a native event in this template.
  notesDirty(): boolean {
    return this.notes.value !== (this.report()?.notes ?? '');
  }

  /** PearlsCardComponent is the dashboard's own widget, reused as-is (fineract-dbug ADR 0022); it never reads
   * `period`'s own sub-fields in its template, so a minimal stand-in satisfies the type without fabricating data. */
  readonly dashboardPearls = computed<DashboardPearls | null>(() => {
    const p = this.report()?.content?.pearls;
    const span = this.report()?.content?.period;
    if (!p || !span) {
      return null;
    }
    return {
      period: {
        fiscalYear: span.fiscalYear,
        label: span.fiscalYearLabel,
        start: span.from,
        end: span.to,
        asOf: span.to,
        months: [],
        current: false
      },
      indicators: p.indicators,
      met: p.met,
      notMet: p.notMet,
      noData: p.noData,
      notApplicable: p.notApplicable
    };
  });

  ngOnInit(): void {
    this.reportsService.offices().subscribe((o) => this.offices.set(o));
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => this.load(Number(p.get('id'))));
  }

  private load(id: number): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.sealedContent.set(null);
    this.showSealedContent.set(false);
    this.reportsService.report(id).subscribe({
      next: (r) => {
        this.report.set(r);
        this.notes.setValue(r.notes ?? '');
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  toggleSealedContent(): void {
    const r = this.report();
    if (!r) {
      return;
    }
    this.showSealedContent.set(!this.showSealedContent());
    if (this.showSealedContent() && this.sealedContent() === null) {
      this.loadingSealedContent.set(true);
      this.reportsService.content(r.id).subscribe({
        next: (text) => {
          this.sealedContent.set(text);
          this.loadingSealedContent.set(false);
        },
        error: () => this.loadingSealedContent.set(false)
      });
    }
  }

  /**
   * Prints from the sealed content only (GET {id}/content), never from the editable `report().content` - so the
   * printout always matches the figures `contentSha256` was taken over, even if the page happens to be open on a
   * report that was since regenerated in another tab.
   */
  openPrint(): void {
    const r = this.report();
    if (!r) {
      return;
    }
    this.loadingPrint.set(true);
    this.reportsService.content(r.id).subscribe({
      next: (text) => {
        this.printContent.set(JSON.parse(text) as ReportContent);
        this.loadingPrint.set(false);
        setTimeout(() => window.print(), 50);
      },
      error: (e) => {
        this.loadingPrint.set(false);
        this.showError(e);
      }
    });
  }

  saveNotes(): void {
    const r = this.report();
    if (!r) {
      return;
    }
    this.savingNotes.set(true);
    this.reportsService.updateNotes(r.id, this.notes.value ?? '').subscribe({
      next: (updated) => {
        this.report.set(updated);
        this.savingNotes.set(false);
      },
      error: (e) => {
        this.savingNotes.set(false);
        this.showError(e);
      }
    });
  }

  private showError(e: unknown): void {
    const err = e as { error?: { defaultUserMessage?: string; errors?: { defaultUserMessage?: string }[] } };
    const message = err?.error?.defaultUserMessage || err?.error?.errors?.[0]?.defaultUserMessage;
    this.snackBar.open(message || this.translate.instant('managementReports.ActionFailed'), undefined, {
      duration: 5000
    });
  }

  regenerate(): void {
    const r = this.report();
    if (!r) {
      return;
    }
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data: {
          title: 'managementReports.RegenerateTitle',
          message: 'managementReports.RegenerateMessage',
          fields: [],
          confirm: 'managementReports.Regenerate'
        },
        width: '480px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.reportsService.regenerate(r.id).subscribe({
            next: (updated) => this.report.set(updated),
            error: (e) => this.showError(e)
          });
        }
      });
  }

  submit(): void {
    const r = this.report();
    if (!r) {
      return;
    }
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data: {
          title: 'managementReports.SubmitTitle',
          message: 'managementReports.SubmitMessage',
          fields: [],
          confirm: 'managementReports.SubmitToTheBoard'
        },
        width: '480px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.reportsService.submit(r.id).subscribe({
            next: (updated) => this.report.set(updated),
            error: (e) => this.showError(e)
          });
        }
      });
  }

  discard(): void {
    const r = this.report();
    if (!r) {
      return;
    }
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'managementReports.DiscardTitle',
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'managementReports.Discard',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.reason) {
          this.reportsService.discard(r.id, result.reason).subscribe({
            next: (updated) => this.report.set(updated),
            error: (e) => this.showError(e)
          });
        }
      });
  }

  approve(): void {
    this.decide('approve');
  }

  returnReport(): void {
    this.decide('return');
  }

  private decide(action: 'approve' | 'return'): void {
    const r = this.report();
    if (!r) {
      return;
    }
    this.dialog
      .open<ApproveDialogComponent, ApproveDialogData, Report>(ApproveDialogComponent, {
        data: { report: r, action },
        width: '480px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.report.set(updated));
  }

  makeCorrectedReport(): void {
    const r = this.report();
    if (!r) {
      return;
    }
    this.dialog
      .open<CreateReportDialogComponent, CreateReportDialogData, Report>(CreateReportDialogComponent, {
        data: { replaces: r, offices: this.offices() },
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
}
