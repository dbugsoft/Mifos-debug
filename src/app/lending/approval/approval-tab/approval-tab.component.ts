/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { Decision as MeetingDecision } from 'app/governance-register/meetings/meetings.models';
import { MeetingsService } from 'app/governance-register/meetings/meetings.service';
import { FormDialogComponent } from 'app/shared/form-dialog/form-dialog.component';
import { InputBase } from 'app/shared/form-dialog/formfield/model/input-base';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FileTabsComponent } from '../../files/file-tabs/file-tabs.component';
import { LoanFile, LoanFileService } from '../../files/loan-file.service';
import { injectHasPermission } from '../../permissions';
import { Approval, ApprovalLevel, ApprovalService, Decision, Outcome, nextStep } from '../approval.service';

/**
 * A loan's Approval tab (fineract-dbug #326): which level must approve and why, the staff recommendation and each
 * level as steps, what approval still waits for, the form for the next step only, and every decision ever entered.
 * Every call answers the whole approval again.
 */
@Component({
  selector: 'mifosx-approval-tab',
  templateUrl: './approval-tab.component.html',
  styleUrls: ['./approval-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    MatButtonToggleGroup,
    MatButtonToggle,
    FileTabsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApprovalTabComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private approvals = inject(ApprovalService);
  private files = inject(LoanFileService);
  private meetings = inject(MeetingsService);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private hasPermission = injectHasPermission();

  readonly loanId = this.route.snapshot.paramMap.get('loanId');
  readonly approval = signal<Approval | null>(null);
  readonly file = signal<LoanFile | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  /** Recorded committee decisions, newest first, for the meeting decision picker. */
  private readonly meetingDecisions = signal<MeetingDecision[]>([]);

  readonly next = computed(() => {
    const a = this.approval();
    return a?.editable ? nextStep(a) : null;
  });

  /** The next step's form, offered only to users who may take that step. */
  readonly mayAct = computed(() => {
    const step = this.next();
    if (!step) {
      return false;
    }
    return this.hasPermission(
      step.kind === 'level' && !step.level.committee ? 'APPROVE_LOANFILE' : 'RECOMMEND_LOANFILE'
    );
  });

  /** The meeting decisions of the committee whose turn it is. */
  readonly pickable = computed(() => {
    const step = this.next();
    const committee = step?.kind === 'level' ? step.level.committee : null;
    return committee ? this.meetingDecisions().filter((d) => d.committeeCode === committee && !d.voided) : [];
  });

  readonly form = this.fb.group({
    outcome: ['RECOMMEND' as Outcome],
    amount: [
      null as number | null,
      Validators.min(1)
    ],
    note: [
      '',
      Validators.maxLength(1000)
    ],
    govDecisionId: [null as number | null]
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.approvals
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

  private show(a: Approval): void {
    this.approval.set(a);
    const step = this.next();
    // The form starts on what the step most likely does: the required level approves, a level below recommends.
    const outcome: Outcome = step?.kind === 'level' && step.level.required ? 'APPROVE' : 'RECOMMEND';
    this.form.reset({ outcome, amount: this.lastAmount(a), note: '', govDecisionId: null });
    if (step?.kind === 'level' && step.level.committee && !this.meetingDecisions().length) {
      this.meetings
        .decisions()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.meetingDecisions.set(list ?? []), error: () => undefined });
    }
  }

  /** The amount last recommended, else the amount asked for. */
  private lastAmount(a: Approval): number {
    const live = a.decisions.filter((d) => !d.voidedAt && d.amount != null);
    return live.length ? live[live.length - 1].amount : a.amount;
  }

  /** Levels above a refusal are greyed: nothing more happens there. */
  isGreyed(index: number): boolean {
    const levels = this.approval()?.levels ?? [];
    return levels.slice(0, index).some((l) => l.latest?.outcome === 'REFUSE');
  }

  get staffRecommendation(): Decision | null {
    const live = (this.approval()?.decisions ?? []).filter((d) => d.level === null && !d.voidedAt);
    return live.length ? live[live.length - 1] : null;
  }

  /** Every decision, newest first, voided ones included. */
  get history(): Decision[] {
    return [...(this.approval()?.decisions ?? [])].reverse();
  }

  get aboveValuation(): boolean {
    const a = this.approval();
    return a?.valuationLimit != null && a.amount > a.valuationLimit;
  }

  /** Approved at the levels: Fineract's own Approve is next. */
  get readyForFineract(): boolean {
    const a = this.approval();
    return !!a?.editable && !a.waitingFor && a.levels.some((l) => l.latest?.outcome === 'APPROVE');
  }

  get approveLink(): (string | number)[] | null {
    const f = this.file();
    return f ? [
          '/members',
          f.clientId,
          'loans-accounts',
          f.loanId,
          'actions',
          'Approve'
        ] : null;
  }

  isTopLevel(level: ApprovalLevel): boolean {
    const levels = this.approval()?.levels ?? [];
    return levels[levels.length - 1]?.code === level.code;
  }

  stepLabel(d: Decision): string {
    return d.level === null
      ? this.translate.instant('lending.approvalTab.Staff recommendation')
      : (d.levelLabel ?? d.level);
  }

  meetingLabel(d: MeetingDecision): string {
    return `${d.reference} · ${d.subject}`;
  }

  mayVoid(d: Decision): boolean {
    const a = this.approval();
    if (!a?.editable || d.voidedAt) {
      return false;
    }
    const level = a.levels.find((l) => l.code === d.level);
    return this.hasPermission(level && !level.committee ? 'APPROVE_LOANFILE' : 'RECOMMEND_LOANFILE');
  }

  date(value: string | null): string {
    return this.files.bsDate(value);
  }

  submit(): void {
    const a = this.approval();
    const step = this.next();
    if (!a || !step || this.busy()) {
      return;
    }
    const v = this.form.getRawValue();
    const note = v.note?.trim() || null;
    if (step.kind === 'staff') {
      if (!v.amount) {
        this.form.controls.amount.setErrors({ required: true });
        this.form.markAllAsTouched();
        return;
      }
      this.run(this.approvals.recommend(a.loanId, v.amount, note));
      return;
    }
    const refusing = v.outcome === 'REFUSE';
    let invalid = false;
    if (refusing && !note) {
      this.form.controls.note.setErrors({ required: true });
      invalid = true;
    }
    if (!refusing && !v.amount) {
      this.form.controls.amount.setErrors({ required: true });
      invalid = true;
    }
    if (step.level.committee && !v.govDecisionId) {
      this.form.controls.govDecisionId.setErrors({ required: true });
      invalid = true;
    }
    if (invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.run(
      this.approvals.decide(a.loanId, {
        level: step.level.code,
        outcome: v.outcome,
        amount: refusing ? null : v.amount,
        note,
        govDecisionId: step.level.committee ? v.govDecisionId : null
      })
    );
  }

  voidDecision(d: Decision): void {
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
          title: this.translate.instant('lending.approvalTab.Void decision'),
          layout: { addButtonText: 'Confirm' },
          formfields: [reason]
        }
      })
      .afterClosed()
      .subscribe((response: { data?: FormGroup }) => {
        const text = (response?.data?.value?.reason ?? '').trim();
        if (text) {
          this.run(this.approvals.voidDecision(this.approval().loanId, d.id, text));
        }
      });
  }

  /** Runs one call and shows the approval it answers; a refusal shows the backend's message through the app's alert. */
  private run(call: Observable<Approval>): void {
    this.busy.set(true);
    call.subscribe({
      next: (a) => {
        this.show(a);
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }
}
