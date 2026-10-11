/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Observable } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { ComplianceService } from '../../compliance.service';
import { GoamlReport } from '../../compliance.models';
import { DueChipComponent } from '../../due-chip/due-chip.component';
import { InputDialogComponent, InputDialogData } from '../../input-dialog/input-dialog.component';
import { CaseDetail, CasesService, SUSPICIONS } from '../cases.service';

/**
 * A compliance case (fineract-dbug #133, #134, #135; mockup "case and report decision"): its alerts, notes and
 * documents, the decision to report or not, and the goAML report made from it. Nothing here reaches the member's page.
 */
@Component({
  selector: 'mifosx-case-detail',
  templateUrl: './case-detail.component.html',
  styleUrls: ['./case-detail.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatIcon,
    MatProgressBar,
    AdToBsPipe,
    FormatNumberPipe,
    DueChipComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaseDetailComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private cases = inject(CasesService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly allowed = signal<boolean | null>(null);
  readonly item = signal<CaseDetail | null>(null);
  readonly report = signal<GoamlReport | null>(null);
  readonly busy = signal(false);
  readonly note = signal('');
  canManage = false;
  canFile = false;

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.canManage = this.compliance.can('MANAGE_AMLCASE');
        this.canFile = this.compliance.can('FILE_GOAML');
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          if (this.allowed()) {
            this.load(Number(p.get('id')));
          }
        });
      });
  }

  private load(id: number): void {
    this.cases.getCase(id).subscribe((k) => this.show(k));
  }

  private show(k: CaseDetail): void {
    this.item.set(k);
    this.busy.set(false);
    if (k.goamlReportId) {
      this.cases.report(k.goamlReportId).subscribe((r) => this.report.set(r));
    } else {
      this.report.set(null);
    }
  }

  addNote(): void {
    const text = this.note().trim();
    if (!text) {
      return;
    }
    this.run(this.cases.addNote(this.item()!.id, text), () => this.note.set(''));
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.run(this.cases.addDocument(this.item()!.id, file));
      input.value = '';
    }
  }

  download(documentId: number, fileName: string): void {
    this.cases.document(this.item()!.id, documentId).subscribe((blob) => this.save(blob, fileName));
  }

  decide(): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data: {
          title: 'compliance.case.Decide',
          message: 'compliance.case.decideLead',
          fields: [
            {
              name: 'decision',
              label: 'compliance.case.Decision',
              type: 'select',
              required: true,
              options: [
                { value: 'REPORT', label: 'compliance.case.decision.REPORT' },
                { value: 'NO_REPORT', label: 'compliance.case.decision.NO_REPORT' }
              ]
            },
            {
              name: 'reportType',
              label: 'compliance.case.Report',
              type: 'select',
              hint: 'compliance.case.reportTypeHint',
              options: [
                { value: 'STR', label: 'compliance.case.reportType.STR' },
                { value: 'SAR', label: 'compliance.case.reportType.SAR' }
              ]
            },
            {
              name: 'suspicion',
              label: 'compliance.case.What is suspected',
              type: 'select',
              hint: 'compliance.case.reportTypeHint',
              options: SUSPICIONS.map((s) => ({ value: s, label: 'compliance.case.suspicion.' + s }))
            },
            { name: 'reason', label: 'compliance.case.Reason', type: 'textarea', required: true, maxLength: 4000 }
          ],
          confirm: 'compliance.case.Decide'
        },
        width: '600px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          const report = r['decision'] === 'REPORT';
          this.run(
            this.cases.decide(this.item()!.id, {
              decision: r['decision'],
              reportType: report ? r['reportType'] || null : null,
              suspicion: report ? r['suspicion'] || null : null,
              reason: r['reason']
            })
          );
        }
      });
  }

  makeReport(): void {
    this.busy.set(true);
    this.cases.makeReport(this.item()!.id).subscribe({
      next: () => this.load(this.item()!.id),
      error: () => this.busy.set(false)
    });
  }

  downloadXml(r: GoamlReport): void {
    this.compliance.reportXml(r.id).subscribe((blob) => this.save(blob, r.reference + '.xml'));
  }

  rebuild(r: GoamlReport): void {
    this.busy.set(true);
    this.compliance.decideReport(r.id, 'regenerate').subscribe({
      next: () => this.load(this.item()!.id),
      error: () => this.busy.set(false)
    });
  }

  sent(r: GoamlReport): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data: {
          title: 'compliance.case.Record as sent',
          message: 'compliance.case.sentLead',
          fields: [{ name: 'fiuReference', label: 'compliance.case.FIU reference', required: true, maxLength: 100 }],
          confirm: 'compliance.case.Record'
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((v) => {
        if (v) {
          this.busy.set(true);
          this.compliance.decideReport(r.id, 'submitted', { fiuReference: v['fiuReference'] }).subscribe({
            next: () => this.load(this.item()!.id),
            error: () => this.busy.set(false)
          });
        }
      });
  }

  private run(call: Observable<CaseDetail>, after?: () => void): void {
    this.busy.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (k) => {
        this.show(k);
        after?.();
      },
      error: () => this.busy.set(false)
    });
  }

  private save(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
