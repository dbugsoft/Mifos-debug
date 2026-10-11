/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { ComplianceService } from '../../compliance.service';
import { InputDialogComponent, InputDialogData } from '../../input-dialog/input-dialog.component';
import { GovernanceService, Report, ReportRow, ReportSection, ReportType } from '../governance.service';

/**
 * One yearly report (fineract-dbug #204): its sections as the form lays them out, the officer's free-text rows and
 * remarks while it is a draft, the chief executive's approval which freezes it, CSV, and a print view for PDF (the
 * browser prints Nepali text correctly).
 */
@Component({
  selector: 'mifosx-report-view',
  templateUrl: './report-view.component.html',
  styleUrls: ['../governance.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportViewComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private governance = inject(GovernanceService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly allowed = signal<boolean | null>(null);
  readonly report = signal<Report | null>(null);
  readonly busy = signal(false);
  readonly values = signal<Record<string, string>>({});
  readonly remarks = signal<Record<string, string>>({});
  canPrepare = false;
  canApprove = false;
  private type: ReportType = 'SCHEDULE_3';
  private year = 0;

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE', 'READ_AMLSUMMARY', 'READ_AMLDECISIONS'));
        this.canPrepare = this.compliance.can('MANAGE_AMLGOVERNANCE');
        this.canApprove = this.compliance.can('READ_AMLDECISIONS');
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          this.type = (p.get('type') ?? '').toUpperCase() as ReportType;
          this.year = Number(p.get('fiscalYear'));
          if (this.allowed()) {
            this.run(this.governance.report(this.type, this.year));
          }
        });
      });
  }

  get draft(): boolean {
    return this.report()?.status === 'DRAFT';
  }

  get dirty(): boolean {
    return Object.keys(this.values()).length + Object.keys(this.remarks()).length > 0;
  }

  /** Schedule 3's table has the form's own columns; the other sections show last year beside this year. */
  full(s: ReportSection): boolean {
    return this.type === 'SCHEDULE_3' && s.key === 'table';
  }

  textOnly(s: ReportSection): boolean {
    return s.rows.every((r) => r.kind === 'TEXT');
  }

  rowLabel(r: ReportRow): string {
    return this.or('compliance.reports.row.' + r.key, r.label);
  }

  sectionTitle(s: ReportSection): string {
    return this.or('compliance.reports.section.' + s.key, s.title);
  }

  show(v: unknown, kind?: string): string {
    if (v === null || v === undefined || v === '') {
      return '';
    }
    if (kind === 'YESNO') {
      return this.translate.instant('compliance.reports.' + v);
    }
    if (typeof v === 'number') {
      return kind === 'AMOUNT'
        ? v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
        : String(Math.round(v * 100) / 100);
    }
    return String(v);
  }

  valueOf(r: ReportRow): string {
    return this.values()[r.key] ?? (r.value === null || r.value === undefined ? '' : String(r.value));
  }

  remarkOf(r: ReportRow): string {
    return this.remarks()[r.key] ?? r.remarks ?? '';
  }

  setValue(key: string, value: string): void {
    this.values.update((v) => ({ ...v, [key]: value }));
  }

  setRemark(key: string, value: string): void {
    this.remarks.update((v) => ({ ...v, [key]: value }));
  }

  save(): void {
    this.run(this.governance.edit(this.type, this.year, this.values(), this.remarks()));
  }

  regenerate(): void {
    this.run(this.governance.generate(this.type, this.year));
  }

  approve(): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data: {
          title: 'compliance.reports.Approve the report',
          message: 'compliance.reports.approveLead',
          fields: [],
          confirm: 'compliance.reports.Approve'
        },
        width: '480px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((r) => r && this.run(this.governance.approve(this.type, this.year)));
  }

  csv(): void {
    this.governance.csv(this.type, this.year).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.type.toLowerCase()}-${this.year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  /** A clean page in a new window, printed by the browser (Save as PDF), with the form's own columns. */
  print(): void {
    const r = this.report();
    if (!r) {
      return;
    }
    const t = (k: string) => this.translate.instant(k);
    const esc = (s: unknown) =>
      String(s ?? '').replace(
        /[&<>"]/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
      );
    const sections = r.sections
      .map((s) => {
        const full = this.full(s);
        const head = full
          ? `<tr><th>${esc(t('compliance.reports.No'))}</th><th>${esc(t('compliance.reports.Particulars'))}</th><th>${esc(
              t('compliance.reports.Up to the previous year')
            )}</th><th>${esc(t('compliance.reports.Change this year'))}</th><th>${esc(t('compliance.reports.Total'))}</th><th>${esc(
              t('compliance.reports.Remarks')
            )}</th></tr>`
          : `<tr><th>${esc(t('compliance.reports.Particulars'))}</th><th>${esc(t('compliance.reports.Value'))}</th><th>${esc(
              t('compliance.reports.Remarks')
            )}</th></tr>`;
        const rows = s.rows
          .map((row) =>
            full
              ? `<tr><td>${esc(row.no)}</td><td>${esc(this.rowLabel(row))}</td><td class="n">${esc(this.show(row.previous))}</td><td class="n">${esc(
                  this.show(row.change)
                )}</td><td class="n">${esc(this.show(row.total, row.kind))}</td><td>${esc(row.remarks)}</td></tr>`
              : `<tr><td>${esc((row.no ? row.no + '. ' : '') + this.rowLabel(row))}</td><td>${esc(this.show(row.value, row.kind))}</td><td>${esc(
                  row.remarks
                )}</td></tr>`
          )
          .join('');
        return `<h2>${esc(this.sectionTitle(s))}</h2><table><thead>${head}</thead><tbody>${rows}</tbody></table>`;
      })
      .join('');
    const sign = `<table class="sign"><tr><th>${esc(t('compliance.reports.Prepared by'))}</th><th>${esc(t('compliance.reports.Approved by'))}</th></tr>
      <tr><td>${esc(r.preparedBy)}<br>${esc(r.preparedAt?.slice(0, 10))}</td><td>${esc(r.approvedBy)}<br>${esc(r.approvedAt?.slice(0, 10))}</td></tr></table>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t('compliance.reports.type.' + r.type))} ${esc(r.label)}</title>
      <style>body{font-family:'Noto Sans Devanagari','Noto Sans',Arial,sans-serif;font-size:12px;margin:24px}h1{font-size:18px;margin:0 0 4px}
      h2{font-size:14px;margin:18px 0 6px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px 6px;vertical-align:top;text-align:left}
      td.n{text-align:right;white-space:nowrap}.sign{margin-top:28px}.sign td{height:56px}p{margin:0;color:#444}</style></head>
      <body><h1>${esc(t('compliance.reports.type.' + r.type))} — ${esc(r.label)}</h1><p>${esc(t('compliance.reports.status.' + r.status))}${
        r.sha256 ? ' · ' + esc(r.sha256.slice(0, 16)) : ''
      }</p>${sections}${sign}</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
  }

  private or(key: string, fallback: string): string {
    const v = this.translate.instant(key);
    return v === key ? fallback : v;
  }

  private run(call: Observable<Report>): void {
    this.busy.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.report.set(r);
        this.values.set({});
        this.remarks.set({});
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }
}
