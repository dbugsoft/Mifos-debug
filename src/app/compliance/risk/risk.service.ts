/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Grade } from '../compliance.models';
import { Edd, EddSummary, MemberRisk, PepExposure, RiskListRow, RiskSummary } from './risk.models';

/**
 * Member risk grades and enhanced due diligence (fineract-dbug #129, #201). Compliance data: the screens call these
 * only for users whose compliance permissions allow it (ComplianceService.can).
 */
@Injectable({ providedIn: 'root' })
export class RiskService {
  private http = inject(HttpClient);

  list(grade: Grade | null, reviewDue: boolean, offset = 0, limit = 100): Observable<RiskListRow[]> {
    let params = new HttpParams().set('offset', offset).set('limit', limit);
    if (grade) {
      params = params.set('grade', grade);
    }
    if (reviewDue) {
      params = params.set('reviewDue', true);
    }
    return this.http.get<RiskListRow[]>('/nepal/aml/risk', { params });
  }

  summary(): Observable<RiskSummary> {
    return this.http.get<RiskSummary>('/nepal/aml/risk/summary');
  }

  member(clientId: number): Observable<MemberRisk> {
    return this.http.get<MemberRisk>(`/nepal/aml/risk/member/${clientId}`);
  }

  override(clientId: number, grade: Grade | null, reason?: string): Observable<MemberRisk> {
    return this.http.post<MemberRisk>(`/nepal/aml/risk/member/${clientId}/override`, { grade, reason: reason || null });
  }

  review(clientId: number, note?: string): Observable<MemberRisk> {
    return this.http.post<MemberRisk>(`/nepal/aml/risk/member/${clientId}/review`, { note: note || null });
  }

  addFlag(
    clientId: number,
    flag: { kind: string; grade?: string; detail: string; source?: string }
  ): Observable<MemberRisk> {
    return this.http.post<MemberRisk>(`/nepal/aml/risk/member/${clientId}/flags`, flag);
  }

  endFlag(clientId: number, flagId: number, reason: string): Observable<MemberRisk> {
    return this.http.post<MemberRisk>(`/nepal/aml/risk/member/${clientId}/flags/${flagId}/end`, { reason });
  }

  peps(clientId: number): Observable<PepExposure[]> {
    return this.http.get<PepExposure[]>(`/nepal/aml/peps/member/${clientId}`);
  }

  eddList(all = false): Observable<Edd[]> {
    return this.http.get<Edd[]>('/nepal/aml/edd', all ? { params: { all: true } } : {});
  }

  eddSummary(): Observable<EddSummary> {
    return this.http.get<EddSummary>('/nepal/aml/edd/summary');
  }

  edd(clientId: number): Observable<Edd[]> {
    return this.http.get<Edd[]>(`/nepal/aml/edd/member/${clientId}`);
  }

  openEdd(clientId: number, why: string): Observable<Edd[]> {
    return this.http.post<Edd[]>(`/nepal/aml/edd/member/${clientId}`, { why });
  }

  reviewEdd(id: number, review: { sourceOfAssets?: string; findings: string; decision: string }): Observable<Edd[]> {
    return this.http.post<Edd[]>(`/nepal/aml/edd/${id}/review`, review);
  }

  closeEdd(id: number, finding: string): Observable<Edd[]> {
    return this.http.post<Edd[]>(`/nepal/aml/edd/${id}/close`, { finding });
  }

  /** The yes/no for staff serving the member: needs only Fineract's READ_CLIENT. */
  extraChecks(clientId: number): Observable<{ clientId: number; extraChecks: boolean }> {
    return this.http.get<{ clientId: number; extraChecks: boolean }>(`/nepal/aml/member-flags/${clientId}`);
  }
}
