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
import { Valuer } from '../valuers/valuers.service';

export type Answer = 'GOOD' | 'OK' | 'WEAK';
export const ANSWERS: Answer[] = [
  'GOOD',
  'OK',
  'WEAK'
];

export interface AppraisalLine {
  code: string;
  label: string;
}

/** One of the 5Cs: the points a line earns for each answer, and its lines. */
export interface AppraisalArea {
  code: string;
  label: string;
  good: number;
  ok: number;
  weak: number;
  lines: AppraisalLine[];
}

export interface ScoreBand {
  from: number;
  /** Null: a band that lends nothing. */
  lendPercentOfCost: number | null;
  needsLand: boolean;
}

export interface AppraisalResult {
  score: number;
  areas: Record<string, number>;
  unanswered: string[];
  band: ScoreBand | null;
  maxLoan: number | null;
  problems: string[];
}

export interface Valuation {
  id: number;
  ownerName: string | null;
  district: string | null;
  municipality: string | null;
  ward: string | null;
  plotNo: string | null;
  area: string | null;
  description: string | null;
  landValue: number | null;
  houseValue: number | null;
  tenancyValue: number | null;
  netValue: number | null;
  recommended: number | null;
  valuer: Valuer | null;
  valuedOn: string | null;
}

/** What is sent to add or correct a valuation. */
export interface ValuationInput {
  ownerName: string;
  district: string | null;
  municipality: string | null;
  ward: string | null;
  plotNo: string | null;
  area: string | null;
  description: string | null;
  landValue: number;
  houseValue: number | null;
  tenancyValue: number | null;
  valuerId: number;
  /** AD, yyyy-MM-dd. */
  valuedOn: string;
}

/** A loan's appraisal and valuations (fineract-dbug docs/lending.md, "Appraisal and valuation"). */
export interface Appraisal {
  loanId: number;
  amount: number;
  required: boolean;
  editable: boolean;
  form: AppraisalArea[];
  answers: Record<string, Answer>;
  projectCost: number | null;
  purpose: string | null;
  opinion: string | null;
  result: AppraisalResult | null;
  updatedBy: string | null;
  updatedAt: string | null;
  valuations: Valuation[];
  recommended: number | null;
  registeredValuerNeeded: boolean;
  hold: boolean;
}

/** What is saved: a null answer clears the line. */
export interface AppraisalInput {
  answers: Record<string, Answer | null>;
  projectCost: number | null;
  purpose: string | null;
  opinion: string | null;
}

/** Every call answers the whole appraisal again, so the screen just shows what came last. */
@Injectable({ providedIn: 'root' })
export class AppraisalService {
  private http = inject(HttpClient);

  get(loanId: number | string): Observable<Appraisal> {
    return this.http.get<Partial<Appraisal>>(`/nepal/lending/appraisals/${loanId}`).pipe(map(withNulls));
  }

  save(loanId: number, body: AppraisalInput): Observable<Appraisal> {
    return this.http.put<Partial<Appraisal>>(`/nepal/lending/appraisals/${loanId}`, body).pipe(map(withNulls));
  }

  addValuation(loanId: number, body: ValuationInput): Observable<Appraisal> {
    return this.http
      .post<Partial<Appraisal>>(`/nepal/lending/appraisals/${loanId}/valuations`, body)
      .pipe(map(withNulls));
  }

  updateValuation(loanId: number, id: number, body: ValuationInput): Observable<Appraisal> {
    return this.http
      .put<Partial<Appraisal>>(`/nepal/lending/appraisals/${loanId}/valuations/${id}`, body)
      .pipe(map(withNulls));
  }

  removeValuation(loanId: number, id: number, reason: string): Observable<Appraisal> {
    return this.http
      .post<Partial<Appraisal>>(`/nepal/lending/appraisals/${loanId}/valuations/${id}/remove`, { reason })
      .pipe(map(withNulls));
  }
}

/** The backend leaves null fields out of its answer: read a missing field as null. */
export function withNulls(a: Partial<Appraisal>): Appraisal {
  const r = a.result;
  return {
    loanId: a.loanId,
    amount: a.amount ?? 0,
    required: a.required ?? false,
    editable: a.editable ?? false,
    form: (a.form ?? []).map((area) => ({
      code: area.code,
      label: area.label ?? area.code,
      good: area.good ?? 0,
      ok: area.ok ?? 0,
      weak: area.weak ?? 0,
      lines: (area.lines ?? []).map((l) => ({ code: l.code, label: l.label ?? l.code }))
    })),
    answers: a.answers ?? {},
    projectCost: a.projectCost ?? null,
    purpose: a.purpose ?? null,
    opinion: a.opinion ?? null,
    result: r
      ? {
          score: r.score ?? 0,
          areas: r.areas ?? {},
          unanswered: r.unanswered ?? [],
          band: r.band
            ? {
                from: r.band.from ?? 0,
                lendPercentOfCost: r.band.lendPercentOfCost ?? null,
                needsLand: !!r.band.needsLand
              }
            : null,
          maxLoan: r.maxLoan ?? null,
          problems: r.problems ?? []
        }
      : null,
    updatedBy: a.updatedBy ?? null,
    updatedAt: a.updatedAt ?? null,
    valuations: (a.valuations ?? []).map((v) => ({
      id: v.id,
      ownerName: v.ownerName ?? null,
      district: v.district ?? null,
      municipality: v.municipality ?? null,
      ward: v.ward ?? null,
      plotNo: v.plotNo ?? null,
      area: v.area ?? null,
      description: v.description ?? null,
      landValue: v.landValue ?? null,
      houseValue: v.houseValue ?? null,
      tenancyValue: v.tenancyValue ?? null,
      netValue: v.netValue ?? null,
      recommended: v.recommended ?? null,
      valuer: v.valuer ?? null,
      valuedOn: v.valuedOn ?? null
    })),
    recommended: a.recommended ?? null,
    registeredValuerNeeded: a.registeredValuerNeeded ?? false,
    hold: a.hold ?? false
  };
}
