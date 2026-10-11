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
import { GoamlReport, Grade } from '../compliance.models';

/** Monitoring alerts, staff concerns and compliance cases (fineract-dbug #133, #134; docs/aml-monitoring.md, docs/aml-cases.md). */

export type AlertStatus = 'NEW' | 'IN_REVIEW' | 'CLOSED' | 'ESCALATED';
export type CaseStatus = 'OPEN' | 'DECIDED_REPORT' | 'DECIDED_NO_REPORT' | 'FILED';

export const ALERT_RULES = [
  'R4',
  'R6',
  'R7',
  'R8',
  'R9',
  'R10',
  'R11',
  'R12'
];
export const SUSPICIONS = [
  'MONEY_LAUNDERING',
  'TERRORIST_FINANCING',
  'FRAUD',
  'CORRUPTION',
  'TAX_EVASION',
  'DRUGS',
  'HUMAN_TRAFFICKING',
  'SANCTIONS',
  'OTHER'
];

export interface Alert {
  id: number;
  rule: string;
  clientId: number | null;
  name: string | null;
  accountNo: string | null;
  office: string | null;
  periodKey: string;
  from: string | null;
  to: string | null;
  amount: number | null;
  threshold: number | null;
  detail: string;
  riskGrade: Grade | null;
  status: AlertStatus;
  caseId: number | null;
  closeReason: string | null;
  closedBy: string | null;
  closedAt: string | null;
  createdAt: string;
  concernId: number | null;
}

export interface AlertDetail extends Alert {
  movements: {
    id: number;
    date: string;
    product: string;
    kind: string;
    direction: string;
    amount: number;
    paymentType: string | null;
  }[];
  grade?: Grade | null;
  earlier?: Alert[];
  concern?: {
    what: string;
    attempted: boolean;
    amount: number | null;
    personName: string | null;
    raisedBy: string;
    raisedAt: string;
  };
}

export interface AlertSummary {
  open: number;
  openHighRisk: number;
  concerns: number;
}

export interface Case {
  id: number;
  reference: string;
  clientId: number | null;
  name: string | null;
  accountNo: string | null;
  summary: string;
  status: CaseStatus;
  suspicion: string | null;
  reportType: 'STR' | 'SAR' | null;
  decisionReason: string | null;
  decidedBy: string | null;
  decidedOn: string | null;
  reportDueOn: string | null;
  daysLeft?: number;
  goamlReportId: number | null;
  openedBy: string;
  openedAt: string;
  alerts: number;
}

export interface CaseDetail extends Omit<Case, 'alerts'> {
  alerts: { id: number; rule: string; detail: string; amount: number | null; createdAt: string }[];
  notes: { id: number; note: string; writtenBy: string; writtenAt: string }[];
  documents: {
    id: number;
    fileName: string;
    description: string | null;
    size: number;
    contentType: string;
    uploadedBy: string;
    uploadedAt: string;
  }[];
  steps: { action: string; detail: string | null; by: string | null; at: string }[];
}

export interface CaseSummary {
  open: number;
  toFile: number;
  late: number;
}

@Injectable({ providedIn: 'root' })
export class CasesService {
  private http = inject(HttpClient);

  alerts(status: string, rule?: string | null): Observable<Alert[]> {
    let params = new HttpParams().set('status', status);
    if (rule) {
      params = params.set('rule', rule);
    }
    return this.http.get<Alert[]>('/nepal/aml/alerts', { params });
  }

  alertSummary(): Observable<AlertSummary> {
    return this.http.get<AlertSummary>('/nepal/aml/alerts/summary');
  }

  alert(id: number): Observable<AlertDetail> {
    return this.http.get<AlertDetail>(`/nepal/aml/alerts/${id}`);
  }

  reviewAlert(id: number): Observable<AlertDetail> {
    return this.http.post<AlertDetail>(`/nepal/aml/alerts/${id}/review`, {});
  }

  closeAlert(id: number, reason: string): Observable<AlertDetail> {
    return this.http.post<AlertDetail>(`/nepal/aml/alerts/${id}/close`, { reason });
  }

  /** Any staff member: the answer is only that it was received. */
  raiseConcern(concern: { clientId?: number; personName?: string; what: string; attempted: boolean; amount?: number }) {
    return this.http.post<{ received: boolean }>('/nepal/aml/alerts/concern', concern);
  }

  cases(status: string): Observable<Case[]> {
    return this.http.get<Case[]>('/nepal/aml/cases', { params: { status } });
  }

  caseSummary(): Observable<CaseSummary> {
    return this.http.get<CaseSummary>('/nepal/aml/cases/summary');
  }

  getCase(id: number): Observable<CaseDetail> {
    return this.http.get<CaseDetail>(`/nepal/aml/cases/${id}`);
  }

  openCase(body: {
    clientId?: number | null;
    subjectName?: string;
    summary: string;
    alertIds: number[];
  }): Observable<CaseDetail> {
    return this.http.post<CaseDetail>('/nepal/aml/cases', body);
  }

  addAlerts(id: number, alertIds: number[]): Observable<CaseDetail> {
    return this.http.post<CaseDetail>(`/nepal/aml/cases/${id}/alerts`, { alertIds });
  }

  addNote(id: number, note: string): Observable<CaseDetail> {
    return this.http.post<CaseDetail>(`/nepal/aml/cases/${id}/notes`, { note });
  }

  addDocument(id: number, file: File, description?: string): Observable<CaseDetail> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('description', description ?? '');
    return this.http.post<CaseDetail>(`/nepal/aml/cases/${id}/documents`, form);
  }

  document(id: number, documentId: number): Observable<Blob> {
    return this.http.get(`/nepal/aml/cases/${id}/documents/${documentId}`, { responseType: 'blob' });
  }

  decide(
    id: number,
    decision: { decision: string; reportType?: string | null; suspicion?: string | null; reason: string }
  ): Observable<CaseDetail> {
    return this.http.post<CaseDetail>(`/nepal/aml/cases/${id}/decide`, decision);
  }

  makeReport(caseId: number): Observable<GoamlReport[]> {
    return this.http.post<GoamlReport[]>('/nepal/aml/goaml/reports', { type: 'CASE', caseId });
  }

  report(id: number): Observable<GoamlReport> {
    return this.http.get<GoamlReport>(`/nepal/aml/goaml/reports/${id}`);
  }
}
