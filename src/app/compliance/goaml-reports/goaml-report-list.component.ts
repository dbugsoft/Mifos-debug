/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Observable, filter, switchMap } from 'rxjs';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ComplianceService } from '../compliance.service';
import { GoamlReport } from '../compliance.models';
import { DueChipComponent } from '../due-chip/due-chip.component';
import { InputDialogComponent, InputDialogData } from '../input-dialog/input-dialog.component';
import { GoamlGapsComponent } from './goaml-gaps.component';

/** Days from today to a yyyy-MM-dd date; negative when it has passed. */
export function daysUntil(date: string | null | undefined, today = new Date()): number | null {
  if (!date) {
    return null;
  }
  const [
    y,
    m,
    d
  ] = date.slice(0, 10).split('-').map(Number);
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - start) / 86400000);
}

/** What the officer does next with a report, in order of importance; the first is the main button. */
export type ReportStep =
  | 'REBUILD'
  | 'PACKAGE'
  | 'SENT'
  | 'FILE_BY_HAND'
  | 'XML'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CORRECT'
  | 'DISCARD';

/** Whether a report can only go by hand: goAML needs someone we hold no details of. */
export function onlyByHand(r: GoamlReport): boolean {
  return (r.problemDetails ?? []).some((g) => g.code === 'threshold.group.account' || g.code === 'case.non.member');
}

/**
 * The steps a report allows, the main one first (docs/goaml-reports.md, "What happens to a report"). A file out of date
 * is rebuilt before anything else; a report only goAML's portal can take is filed by hand.
 */
export function reportSteps(r: GoamlReport): ReportStep[] {
  switch (r.status) {
    case 'DRAFT':
      return onlyByHand(r) ? [
            'FILE_BY_HAND',
            'DISCARD'
          ] : [
            'REBUILD',
            'XML',
            'FILE_BY_HAND',
            'DISCARD'
          ];
    case 'READY':
      return r.stale ? [
            'REBUILD',
            'XML',
            'FILE_BY_HAND',
            'DISCARD'
          ] : [
            'PACKAGE',
            'SENT',
            'XML',
            'REBUILD',
            'FILE_BY_HAND',
            'DISCARD'
          ];
    case 'SUBMITTED':
      return [
        'ACCEPTED',
        'REJECTED',
        'CORRECT'
      ];
    case 'ACCEPTED':
      return ['CORRECT'];
    case 'REJECTED':
      return ['CORRECT'];
    default:
      return [];
  }
}

/**
 * goAML reports as cards (fineract-dbug #289, #291; ADR-0062): each says where it stands, what keeps it back and what to
 * do next, with the steps the backend allows from its status. Used by the threshold, suspicious and sent pages and the
 * case page, so a report reads and behaves the same everywhere.
 */
@Component({
  selector: 'mifosx-goaml-report-list',
  templateUrl: './goaml-report-list.component.html',
  styleUrls: ['./goaml-report-list.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCheckbox,
    AdToBsPipe,
    DueChipComponent,
    GoamlGapsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoamlReportListComponent {
  private compliance = inject(ComplianceService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  readonly reports = input.required<GoamlReport[]>();
  /** Show each report's type (on a page that mixes them). */
  readonly showType = input(false);
  /** Let ready threshold reports be chosen for one zip. */
  readonly selectable = input(false);
  /** Show the member's name (not on the case page, which is about them). */
  readonly showMember = input(true);

  /** After a step changed a report: the page reloads. */
  readonly changed = output<GoamlReport | null>();

  readonly busy = signal(false);
  readonly selected = signal<Set<number>>(new Set());
  readonly canFile = computed(() => this.compliance.can('FILE_GOAML'));
  readonly packable = computed(() => this.reports().filter((r) => this.canPack(r)));
  readonly steps = reportSteps;
  readonly daysUntil = daysUntil;

  constructor() {
    // a reloaded list keeps only choices still on it
    effect(() => {
      const ids = new Set(this.reports().map((r) => r.id));
      const kept = [...this.selected()].filter((id) => ids.has(id));
      if (kept.length !== this.selected().size) {
        this.selected.set(new Set(kept));
      }
    });
  }

  canPack(r: GoamlReport): boolean {
    return r.type === 'TTR' && r.status === 'READY' && !r.stale;
  }

  toggle(r: GoamlReport): void {
    const next = new Set(this.selected());
    next.has(r.id) ? next.delete(r.id) : next.add(r.id);
    this.selected.set(next);
  }

  toggleAll(): void {
    const all = this.packable();
    this.selected.set(this.selected().size === all.length ? new Set() : new Set(all.map((r) => r.id)));
  }

  /** Days left before a report still to send is late; none once it is sent. */
  dueIn(r: GoamlReport): number | null {
    return [
      'DRAFT',
      'READY',
      'REJECTED'
    ].includes(r.status) ? daysUntil(r.dueOn) : null;
  }

  statusTone(r: GoamlReport): string {
    if (r.stale && (r.status === 'DRAFT' || r.status === 'READY')) {
      return 'chip amber';
    }
    switch (r.status) {
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

  run(step: ReportStep, r: GoamlReport): void {
    switch (step) {
      case 'REBUILD':
        return this.call(this.compliance.decideReport(r.id, 'regenerate'), 'compliance.Report rebuilt');
      case 'PACKAGE':
        return this.save(this.compliance.reportPackage(r.id), r.reference + '.zip');
      case 'XML':
        // a draft or a file out of date downloads for checking only, named so it is not uploaded by mistake
        return this.save(
          this.compliance.reportXml(r.id),
          (r.status === 'READY' && !r.stale ? '' : 'DRAFT-') + r.reference + '.xml'
        );
      case 'SENT':
        return this.recordSent(r);
      case 'FILE_BY_HAND':
        return this.fileByHand(r);
      case 'ACCEPTED':
        return this.ask(
          {
            title: 'compliance.Record as accepted',
            fields: [{ name: 'note', label: 'compliance.reports.Note', type: 'textarea', maxLength: 1000 }],
            confirm: 'compliance.Record as accepted'
          },
          (v) => this.compliance.decideReport(r.id, 'accepted', v.note ? { note: v.note } : {}),
          'compliance.Recorded'
        );
      case 'REJECTED':
        return this.ask(
          {
            title: 'compliance.Record as rejected',
            message: 'compliance.reports.rejectedHint',
            fields: [{ name: 'reason', label: 'compliance.What FIU-Nepal said', type: 'textarea', required: true }],
            confirm: 'compliance.Record as rejected',
            danger: true
          },
          (v) => this.compliance.decideReport(r.id, 'rejected', v),
          'compliance.Recorded'
        );
      case 'CORRECT':
        return this.ask(
          {
            title: 'compliance.reports.Make a correction',
            message: 'compliance.reports.correctHint',
            fields: [],
            confirm: 'compliance.reports.Make a correction'
          },
          () => this.compliance.decideReport(r.id, 'correct'),
          'compliance.Correction made'
        );
      case 'DISCARD':
        return this.ask(
          {
            title: 'compliance.reports.Discard this report',
            message: r.replacesReportId ? 'compliance.reports.discardCorrectionHint' : 'compliance.reports.discardHint',
            fields: [],
            confirm: 'compliance.reports.Discard',
            danger: true
          },
          () => this.compliance.decideReport(r.id, 'discard'),
          'compliance.Report discarded'
        );
    }
  }

  /** One zip of the chosen ready threshold reports. */
  packChosen(): void {
    const ids = [...this.selected()];
    if (ids.length) {
      this.save(this.compliance.reportsPackage(ids), 'TTR-' + new Date().toISOString().slice(0, 10) + '.zip');
    }
  }

  private recordSent(r: GoamlReport): void {
    this.ask(
      {
        title: 'compliance.Record as sent',
        message: 'compliance.Record as sent explanation',
        fields: [
          { name: 'fiuReference', label: 'compliance.FIU reference number', required: true, maxLength: 100 },
          { name: 'submittedOn', label: 'compliance.Sent on', type: 'date', required: true, value: today() }
        ],
        confirm: 'compliance.Record as sent'
      },
      (v) => this.compliance.decideReport(r.id, 'submitted', v),
      'compliance.Recorded'
    );
  }

  private fileByHand(r: GoamlReport): void {
    this.ask(
      {
        title: 'compliance.reports.Record as filed by hand',
        message: onlyByHand(r) ? 'compliance.reports.byHandOnlyHint' : 'compliance.reports.byHandHint',
        fields: [
          { name: 'fiuReference', label: 'compliance.FIU reference number', required: true, maxLength: 100 },
          { name: 'submittedOn', label: 'compliance.Sent on', type: 'date', required: true, value: today() },
          {
            name: 'reason',
            label: 'compliance.reports.Why by hand',
            type: 'textarea',
            required: true,
            maxLength: 1000,
            value: onlyByHand(r) ? this.translate.instant('compliance.reports.byHandReason') : ''
          }
        ],
        confirm: 'compliance.reports.Record as filed by hand'
      },
      (v) => this.compliance.decideReport(r.id, 'filed-by-hand', v),
      'compliance.Recorded'
    );
  }

  private ask(data: InputDialogData, then: (v: Record<string, string>) => Observable<GoamlReport>, done: string): void {
    this.dialog
      .open(InputDialogComponent, { data, width: '520px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(
        filter((v): v is Record<string, string> => !!v),
        switchMap((v) => {
          this.busy.set(true);
          return then(v);
        })
      )
      .subscribe({
        next: (report) => this.after(done, report),
        error: () => this.busy.set(false)
      });
  }

  private call(step: Observable<GoamlReport>, done: string): void {
    this.busy.set(true);
    step.subscribe({ next: (report) => this.after(done, report), error: () => this.busy.set(false) });
  }

  private after(message: string, report: GoamlReport | null): void {
    this.busy.set(false);
    this.snackBar.open(this.translate.instant(message), undefined, { duration: 3000 });
    this.changed.emit(report);
  }

  private save(file: Observable<Blob>, name: string): void {
    this.busy.set(true);
    file.subscribe({
      next: (blob) => {
        this.busy.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.busy.set(false)
    });
  }
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
