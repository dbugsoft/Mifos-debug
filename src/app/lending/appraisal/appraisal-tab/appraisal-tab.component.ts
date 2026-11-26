/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable, filter, map, startWith } from 'rxjs';
import { injectHasPermission } from '../../permissions';
import { FormDialogComponent } from 'app/shared/form-dialog/form-dialog.component';
import { InputBase } from 'app/shared/form-dialog/formfield/model/input-base';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FileTabsComponent } from '../../files/file-tabs/file-tabs.component';
import { LoanFile, LoanFileService } from '../../files/loan-file.service';
import { ANSWERS, Answer, Appraisal, AppraisalArea, AppraisalService, Valuation } from '../appraisal.service';
import { ValuationDialogComponent, ValuationDialogData } from '../valuation-dialog/valuation-dialog.component';

/**
 * A loan's Appraisal tab (fineract-dbug #325): the 5C form with its running score, the band and the most that may be
 * lent, and the valuations of the land and houses pledged. Every call answers the whole appraisal again.
 */
@Component({
  selector: 'mifosx-appraisal-tab',
  templateUrl: './appraisal-tab.component.html',
  styleUrls: ['./appraisal-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatTable,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatCell,
    MatCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    FileTabsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppraisalTabComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private appraisals = inject(AppraisalService);
  private files = inject(LoanFileService);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private hasPermission = injectHasPermission();

  readonly answers = ANSWERS;
  readonly loanId = this.route.snapshot.paramMap.get('loanId');
  readonly appraisal = signal<Appraisal | null>(null);
  readonly file = signal<LoanFile | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly mayAppraise = this.hasPermission('APPRAISE_LOANFILE');

  readonly form = this.fb.group({
    answers: new FormGroup<Record<string, FormControl<Answer | null>>>({}),
    projectCost: [null as number | null],
    purpose: [''],
    opinion: ['']
  });

  /** The answers as they stand on screen, for the running score (the whole form: its answers group is replaced). */
  private readonly answerValues = toSignal(
    this.form.valueChanges.pipe(
      startWith({}),
      map(() => this.form.controls.answers.getRawValue())
    ),
    { initialValue: {} as Record<string, Answer | null> }
  );

  ngOnInit(): void {
    this.loading.set(true);
    this.appraisals
      .get(this.loanId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => {
          this.show(a);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    this.files
      .get(this.loanId, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (f) => this.file.set(f), error: () => undefined });
  }

  /** Puts an answer on screen and rebuilds the form from it, as the backend saw it. */
  private show(a: Appraisal): void {
    this.appraisal.set(a);
    const group = new FormGroup<Record<string, FormControl<Answer | null>>>({});
    for (const area of a.form) {
      for (const line of area.lines) {
        group.addControl(line.code, new FormControl<Answer | null>(a.answers[line.code] ?? null));
      }
    }
    this.form.setControl('answers', group);
    this.form.patchValue({ projectCost: a.projectCost, purpose: a.purpose ?? '', opinion: a.opinion ?? '' });
    if (this.editable) {
      this.form.enable();
    } else {
      this.form.disable();
    }
    this.form.markAsPristine();
  }

  get editable(): boolean {
    return !!this.appraisal()?.editable && this.mayAppraise;
  }

  /** The score of the answers on screen: each answered line earns its area's points for that answer. */
  get score(): number {
    return (this.appraisal()?.form ?? []).reduce((sum, area) => sum + this.areaPoints(area), 0);
  }

  areaPoints(area: AppraisalArea): number {
    const values = this.answerValues();
    const points = { GOOD: area.good, OK: area.ok, WEAK: area.weak };
    return area.lines.reduce((sum, l) => sum + (values[l.code] ? points[values[l.code]] : 0), 0);
  }

  areaMax(area: AppraisalArea): number {
    return area.good * area.lines.length;
  }

  /** Lines the backend found unanswered, highlighted once the appraisal has been saved and while still empty. */
  isUnanswered(code: string): boolean {
    const a = this.appraisal();
    return !!a?.updatedAt && (a.result?.unanswered ?? []).includes(code) && !this.answerValues()[code];
  }

  /** "70 band: up to 70% of the project cost, land needed". */
  bandText(): string {
    const band = this.appraisal()?.result?.band;
    if (!band) {
      return '';
    }
    if (band.lendPercentOfCost == null) {
      return this.translate.instant('lending.appraisalTab.bandNoLoan', { from: band.from });
    }
    const text = this.translate.instant('lending.appraisalTab.band', {
      from: band.from,
      percent: band.lendPercentOfCost
    });
    return band.needsLand ? `${text}, ${this.translate.instant('lending.appraisalTab.landNeeded')}` : text;
  }

  /** The Nepali wording of the sample's areas and lines; a cooperative's own shows its label as it is. */
  label(code: string, label: string): string {
    const key = `lending.appraisal.${code}`;
    const text = this.translate.instant(key);
    return text && text !== key ? text : label;
  }

  date(value: string | null): string {
    return this.files.bsDate(value);
  }

  valuationColumns(a: Appraisal): string[] {
    const columns = [
      'owner',
      'place',
      'land',
      'house',
      'tenancy',
      'net',
      'recommended',
      'valuer',
      'valuedOn'
    ];
    return a.editable && this.mayAppraise ? [
          ...columns,
          'actions'
        ] : columns;
  }

  place(v: Valuation): string {
    const ward = v.ward ? `${this.translate.instant('lending.appraisalTab.Ward')} ${v.ward}` : null;
    const plot = v.plotNo ? `${this.translate.instant('lending.appraisalTab.Plot no')} ${v.plotNo}` : null;
    return [
      v.district,
      v.municipality,
      ward,
      plot
    ]
      .filter(Boolean)
      .join(', ');
  }

  /** Saves what is on screen, half done or not. */
  save(): void {
    const a = this.appraisal();
    if (!a || this.busy()) {
      return;
    }
    const v = this.form.getRawValue();
    this.run(
      this.appraisals.save(a.loanId, {
        answers: v.answers,
        projectCost: v.projectCost ?? null,
        purpose: v.purpose?.trim() || null,
        opinion: v.opinion?.trim() || null
      })
    );
  }

  openValuation(valuation?: Valuation): void {
    const a = this.appraisal();
    this.dialog
      .open<ValuationDialogComponent, ValuationDialogData, Appraisal>(ValuationDialogComponent, {
        data: { loanId: a.loanId, valuation, registeredValuerNeeded: a.registeredValuerNeeded, hold: a.hold },
        width: '720px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe((next) => this.keepEditsAndShow(next));
  }

  removeValuation(valuation: Valuation): void {
    const reason = new InputBase({
      controlName: 'reason',
      label: this.translate.instant('lending.file.Reason'),
      value: '',
      type: 'text',
      required: true,
      order: 1
    });
    this.dialog
      .open(FormDialogComponent, {
        data: {
          title: this.translate.instant('lending.appraisalTab.Remove valuation'),
          layout: { addButtonText: 'Confirm' },
          formfields: [reason]
        }
      })
      .afterClosed()
      .subscribe((response: { data?: FormGroup }) => {
        const text = (response?.data?.value?.reason ?? '').trim();
        if (text) {
          this.run(this.appraisals.removeValuation(this.appraisal().loanId, valuation.id, text), true);
        }
      });
  }

  /** A valuation changes the limits only; unsaved answers on screen stay as they are. */
  private keepEditsAndShow(next: Appraisal): void {
    if (this.form.dirty) {
      this.appraisal.set({ ...this.appraisal(), valuations: next.valuations, recommended: next.recommended });
    } else {
      this.show(next);
    }
  }

  private run(call: Observable<Appraisal>, keepEdits = false): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    call.subscribe({
      next: (a) => {
        if (keepEdits) {
          this.keepEditsAndShow(a);
        } else {
          this.show(a);
        }
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }

  /** Asked by the route before leaving the tab with answers not yet saved. */
  canLeave(): boolean {
    return !this.form.dirty || window.confirm(this.translate.instant('lending.appraisalTab.leaveUnsaved'));
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.form.dirty) {
      event.preventDefault();
    }
  }
}
