/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { Observable, filter, switchMap } from 'rxjs';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ComplianceService } from '../compliance.service';
import { GoamlReport, TtrItem, TtrItemDetail, TtrStatus, isoDate } from '../compliance.models';
import { DueChipComponent } from '../due-chip/due-chip.component';
import { InputDialogComponent, InputDialogData } from '../input-dialog/input-dialog.component';

type View = 'NEW' | 'HISTORICAL' | 'EXEMPT' | 'REPORTED' | 'ALL';

/**
 * Threshold reports (fineract-dbug #131, #134, #135): each member's cash in or out of the threshold in a day must reach
 * FIU-Nepal within 15 days. Choose items, make the goAML files, upload them in the goAML portal, and record what
 * happened. Nothing here is visible to anyone without the compliance permissions.
 */
@Component({
  selector: 'mifosx-threshold-reports',
  templateUrl: './threshold-reports.component.html',
  styleUrls: ['./threshold-reports.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FormsModule,
    MatButtonToggleModule,
    MatProgressBar,
    MatTableModule,
    FormatNumberPipe,
    AdToBsPipe,
    DueChipComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThresholdReportsComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);

  readonly views: { value: View; label: string }[] = [
    { value: 'NEW', label: 'compliance.To report' },
    { value: 'HISTORICAL', label: 'compliance.Found after their deadline' },
    { value: 'EXEMPT', label: 'compliance.Exempt' },
    { value: 'REPORTED', label: 'compliance.Reported' },
    { value: 'ALL', label: 'compliance.All' }
  ];
  view: View = 'NEW';

  readonly loading = signal(true);
  readonly items = signal<TtrItem[]>([]);
  readonly reports = signal<GoamlReport[]>([]);
  readonly selected = signal<Set<number>>(new Set());
  readonly detail = signal<TtrItemDetail | null>(null);
  readonly busy = signal(false);
  readonly canFile = computed(() => this.compliance.can('FILE_GOAML'));

  readonly itemColumns = [
    'select',
    'transactionDate',
    'member',
    'cash',
    'amount',
    'dueOn',
    'status'
  ];
  readonly reportColumns = [
    'reference',
    'member',
    'status',
    'actions'
  ];
  readonly isoDate = isoDate;

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status') as View | null;
    if (status && this.views.some((v) => v.value === status)) {
      this.view = status;
    }
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.selected.set(new Set());
    const status: TtrStatus | 'ALL' | undefined =
      this.view === 'NEW' ? undefined : this.view === 'REPORTED' ? 'REPORTED' : this.view;
    this.compliance
      .ttrItems(status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.items.set(items);
        this.loading.set(false);
      });
    this.loadReports();
  }

  private loadReports(): void {
    this.compliance
      .goamlReports()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((reports) => this.reports.set(reports.filter((r) => r.type === 'TTR').slice(0, 50)));
  }

  selectable(item: TtrItem): boolean {
    return item.status === 'NEW' && this.canFile();
  }

  toggle(item: TtrItem): void {
    const next = new Set(this.selected());
    next.has(item.id) ? next.delete(item.id) : next.add(item.id);
    this.selected.set(next);
  }

  open(item: TtrItem): void {
    this.compliance
      .ttrItem(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => this.detail.set(d));
  }

  close(): void {
    this.detail.set(null);
  }

  makeReports(): void {
    const ids = [...this.selected()];
    if (!ids.length) {
      return;
    }
    this.busy.set(true);
    this.compliance
      .makeTtrReports(ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (made) => {
          this.busy.set(false);
          const ready = made.filter((r) => r.status === 'READY').length;
          this.snackBar.open(
            this.translate.instant('compliance.Reports made', { count: made.length, ready }),
            undefined,
            { duration: 4000 }
          );
          this.load();
        },
        error: () => this.busy.set(false)
      });
  }

  exempt(item: TtrItem): void {
    this.ask({
      title: 'compliance.Exempt this item',
      message: 'compliance.Exempt explanation',
      fields: [{ name: 'reason', label: 'compliance.Reason', type: 'textarea', required: true, maxLength: 450 }],
      confirm: 'compliance.Exempt'
    })
      .pipe(switchMap((v) => this.compliance.decideTtr(item.id, 'exempt', v.reason)))
      .subscribe(() => this.after('compliance.Item exempted'));
  }

  reportLate(item: TtrItem): void {
    this.compliance.decideTtr(item.id, 'report').subscribe(() => this.after('compliance.Moved to the queue'));
  }

  reopen(item: TtrItem): void {
    this.compliance.decideTtr(item.id, 'reopen').subscribe(() => this.after('compliance.Moved to the queue'));
  }

  download(report: GoamlReport): void {
    this.compliance.reportXml(report.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.reference + '.xml';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  regenerate(report: GoamlReport): void {
    this.compliance.decideReport(report.id, 'regenerate').subscribe(() => this.after('compliance.Report rebuilt'));
  }

  submitted(report: GoamlReport): void {
    this.ask({
      title: 'compliance.Record as sent',
      message: 'compliance.Record as sent explanation',
      fields: [
        { name: 'fiuReference', label: 'compliance.FIU reference number', required: true, maxLength: 100 },
        {
          name: 'submittedOn',
          label: 'compliance.Sent on',
          type: 'date',
          required: true,
          value: new Date().toISOString().slice(0, 10)
        }
      ],
      confirm: 'compliance.Record as sent'
    })
      .pipe(switchMap((v) => this.compliance.decideReport(report.id, 'submitted', v)))
      .subscribe(() => this.after('compliance.Recorded'));
  }

  accepted(report: GoamlReport): void {
    this.compliance.decideReport(report.id, 'accepted').subscribe(() => this.after('compliance.Recorded'));
  }

  rejected(report: GoamlReport): void {
    this.ask({
      title: 'compliance.Record as rejected',
      fields: [{ name: 'reason', label: 'compliance.What FIU-Nepal said', type: 'textarea', required: true }],
      confirm: 'compliance.Record as rejected',
      danger: true
    })
      .pipe(switchMap((v) => this.compliance.decideReport(report.id, 'rejected', v)))
      .subscribe(() => this.after('compliance.Recorded'));
  }

  correct(report: GoamlReport): void {
    this.compliance.decideReport(report.id, 'correct').subscribe(() => this.after('compliance.Correction made'));
  }

  discard(report: GoamlReport): void {
    this.compliance.decideReport(report.id, 'discard').subscribe(() => this.after('compliance.Report discarded'));
  }

  statusTone(status: string): string {
    switch (status) {
      case 'READY':
      case 'ACCEPTED':
        return 'chip green';
      case 'DRAFT':
        return 'chip amber';
      case 'REJECTED':
        return 'chip red';
      case 'SUBMITTED':
        return 'chip blue';
      default:
        return 'chip grey';
    }
  }

  private ask(data: InputDialogData): Observable<Record<string, string>> {
    return this.dialog
      .open(InputDialogComponent, { data, width: '520px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(filter((v): v is Record<string, string> => !!v));
  }

  private after(message: string): void {
    this.snackBar.open(this.translate.instant(message), undefined, { duration: 3000 });
    this.detail.set(null);
    this.load();
  }
}
