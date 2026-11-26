/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export type Outcome = 'RECOMMEND' | 'APPROVE' | 'REFUSE';

/** A staff recommendation (no level) or a level's decision, voided ones too. */
export interface Decision {
  id: number;
  level: string | null;
  levelLabel: string | null;
  outcome: Outcome;
  amount: number | null;
  note: string | null;
  govDecisionId: number | null;
  /** The meeting decision in words: "Board of Directors decision 12 of 2083/84, 2083-05-10". */
  meetingDecision: string | null;
  toConfirm: boolean;
  confirmedBy: string | null;
  aboveValuation: boolean;
  decidedBy: string | null;
  decidedAt: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

export interface ApprovalLevel {
  code: string;
  label: string;
  upToPercentOfCapital: number | null;
  /** A governance committee code; null for a person (the Manager). */
  committee: string | null;
  required: boolean;
  latest: Decision | null;
}

/** Who must approve a loan and what has been decided (fineract-dbug docs/lending.md, "Approval by amount"). */
export interface Approval {
  loanId: number;
  amount: number;
  enforced: boolean;
  editable: boolean;
  primaryCapital: number | null;
  percentOfCapital: number | null;
  requiredLevel: string | null;
  requiredWhy: string | null;
  levels: ApprovalLevel[];
  decisions: Decision[];
  waitingFor: string | null;
  appraisalScore: number | null;
  appraisalLimit: number | null;
  valuationLimit: number | null;
}

export interface DecisionInput {
  level: string;
  outcome: Outcome;
  amount: number | null;
  note: string | null;
  govDecisionId: number | null;
}

/** A small office's approval waiting to be confirmed at the next committee meeting. */
export interface ToConfirm {
  decisionId: number;
  loanId: number;
  accountNo: string;
  clientName: string;
  officeName: string;
  level: string;
  amount: number | null;
  decidedBy: string | null;
  decidedOn: string | null;
}

/**
 * The next step the form is for: the staff recommendation, one level's decision, or nothing (a level approved or
 * refused, or every level has recommended).
 */
export type NextStep = { kind: 'staff' } | { kind: 'level'; level: ApprovalLevel } | null;

export function nextStep(a: Approval): NextStep {
  if (!a.decisions.some((d) => d.level === null && !d.voidedAt)) {
    return { kind: 'staff' };
  }
  for (const level of a.levels) {
    if (!level.latest) {
      return { kind: 'level', level };
    }
    if (level.latest.outcome !== 'RECOMMEND') {
      return null;
    }
  }
  return null;
}

/** Every call answers the whole approval again, so the screen just shows what came last. */
@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private http = inject(HttpClient);

  get(loanId: number | string): Observable<Approval> {
    return this.http.get<Partial<Approval>>(`/nepal/lending/approvals/${loanId}`).pipe(map(withNulls));
  }

  recommend(loanId: number, amount: number, note: string | null): Observable<Approval> {
    return this.http
      .post<Partial<Approval>>(`/nepal/lending/approvals/${loanId}/recommendation`, { amount, note })
      .pipe(map(withNulls));
  }

  decide(loanId: number, body: DecisionInput): Observable<Approval> {
    return this.http.post<Partial<Approval>>(`/nepal/lending/approvals/${loanId}/decisions`, body).pipe(map(withNulls));
  }

  voidDecision(loanId: number, decisionId: number, reason: string): Observable<Approval> {
    return this.http
      .post<Partial<Approval>>(`/nepal/lending/approvals/${loanId}/decisions/${decisionId}/void`, { reason })
      .pipe(map(withNulls));
  }

  toConfirm(): Observable<ToConfirm[]> {
    return this.http
      .get<Partial<ToConfirm>[]>('/nepal/lending/approvals/to-confirm')
      .pipe(map((rows) => (rows ?? []).map(toConfirmWithNulls)));
  }

  confirm(decisionId: number, govDecisionId: number): Observable<ToConfirm[]> {
    return this.http
      .post<Partial<ToConfirm>[]>(`/nepal/lending/approvals/to-confirm/${decisionId}/confirm`, { govDecisionId })
      .pipe(map((rows) => (rows ?? []).map(toConfirmWithNulls)));
  }
}

function decisionWithNulls(d: Partial<Decision>): Decision {
  return {
    id: d.id,
    level: d.level ?? null,
    levelLabel: d.levelLabel ?? null,
    outcome: d.outcome,
    amount: d.amount ?? null,
    note: d.note ?? null,
    govDecisionId: d.govDecisionId ?? null,
    meetingDecision: d.meetingDecision ?? null,
    toConfirm: d.toConfirm ?? false,
    confirmedBy: d.confirmedBy ?? null,
    aboveValuation: d.aboveValuation ?? false,
    decidedBy: d.decidedBy ?? null,
    decidedAt: d.decidedAt ?? null,
    voidedBy: d.voidedBy ?? null,
    voidedAt: d.voidedAt ?? null,
    voidReason: d.voidReason ?? null
  };
}

/** The backend leaves null fields out of its answer: read a missing field as null. */
export function withNulls(a: Partial<Approval>): Approval {
  return {
    loanId: a.loanId,
    amount: a.amount ?? 0,
    enforced: a.enforced ?? false,
    editable: a.editable ?? false,
    primaryCapital: a.primaryCapital ?? null,
    percentOfCapital: a.percentOfCapital ?? null,
    requiredLevel: a.requiredLevel ?? null,
    requiredWhy: a.requiredWhy ?? null,
    levels: (a.levels ?? []).map((l) => ({
      code: l.code,
      label: l.label ?? l.code,
      upToPercentOfCapital: l.upToPercentOfCapital ?? null,
      committee: l.committee ?? null,
      required: l.required ?? false,
      latest: l.latest ? decisionWithNulls(l.latest) : null
    })),
    decisions: (a.decisions ?? []).map(decisionWithNulls),
    waitingFor: a.waitingFor ?? null,
    appraisalScore: a.appraisalScore ?? null,
    appraisalLimit: a.appraisalLimit ?? null,
    valuationLimit: a.valuationLimit ?? null
  };
}

function toConfirmWithNulls(r: Partial<ToConfirm>): ToConfirm {
  return {
    decisionId: r.decisionId,
    loanId: r.loanId,
    accountNo: r.accountNo ?? '',
    clientName: r.clientName ?? '',
    officeName: r.officeName ?? '',
    level: r.level ?? '',
    amount: r.amount ?? null,
    decidedBy: r.decidedBy ?? null,
    decidedOn: r.decidedOn ?? null
  };
}
