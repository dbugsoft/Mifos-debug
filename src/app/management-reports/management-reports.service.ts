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
import { Office, Period, Report, ReportSummary } from './management-reports.models';

const BASE = '/nepal/management-reports';

/** All calls under /v1/nepal/management-reports (fineract-dbug #142; docs/management-report.md). */
@Injectable({ providedIn: 'root' })
export class ManagementReportsService {
  private http = inject(HttpClient);

  reports(officeId?: number, fiscalYear?: number, status?: string): Observable<ReportSummary[]> {
    let params = new HttpParams();
    if (officeId !== undefined) {
      params = params.set('officeId', officeId);
    }
    if (fiscalYear !== undefined) {
      params = params.set('fiscalYear', fiscalYear);
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ReportSummary[]>(BASE, { params });
  }

  periods(fiscalYear?: number): Observable<Period[]> {
    const params = fiscalYear !== undefined ? new HttpParams().set('fiscalYear', fiscalYear) : undefined;
    return this.http.get<Period[]>(`${BASE}/periods`, { params });
  }

  create(body: Record<string, unknown>): Observable<Report> {
    return this.http.post<Report>(BASE, body);
  }

  report(id: number): Observable<Report> {
    return this.http.get<Report>(`${BASE}/${id}`);
  }

  /** The stored report exactly as kept, as text - not re-parsed/re-formatted, so it matches `contentSha256`. */
  content(id: number): Observable<string> {
    return this.http.get(`${BASE}/${id}/content`, { responseType: 'text' });
  }

  updateNotes(id: number, notes: string): Observable<Report> {
    return this.http.put<Report>(`${BASE}/${id}`, { notes });
  }

  regenerate(id: number): Observable<Report> {
    return this.http.post<Report>(`${BASE}/${id}`, {}, { params: { command: 'regenerate' } });
  }

  submit(id: number): Observable<Report> {
    return this.http.post<Report>(`${BASE}/${id}`, {}, { params: { command: 'submit' } });
  }

  approve(id: number, decisionId: number, note: string | null): Observable<Report> {
    return this.http.post<Report>(`${BASE}/${id}`, { decisionId, note }, { params: { command: 'approve' } });
  }

  returnReport(id: number, decisionId: number, note: string | null): Observable<Report> {
    return this.http.post<Report>(`${BASE}/${id}`, { decisionId, note }, { params: { command: 'return' } });
  }

  discard(id: number, reason: string): Observable<Report> {
    return this.http.post<Report>(`${BASE}/${id}`, { reason }, { params: { command: 'discard' } });
  }

  // ── offices, for the office picker (Fineract's own /offices, as every other module already calls it) ──

  offices(): Observable<Office[]> {
    return this.http.get<Office[]>('/offices');
  }
}
