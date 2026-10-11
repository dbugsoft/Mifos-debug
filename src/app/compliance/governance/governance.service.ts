/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * The yearly AML reports and AML governance (fineract-dbug #204, #205; docs/aml-yearly-reports.md,
 * docs/aml-governance.md). Fineract leaves null fields out of its answers, so a field typed `| null` may be missing.
 */

export type ReportType = 'SCHEDULE_3' | 'INSTITUTIONAL_RISK' | 'ANNUAL_REPORT';
export const REPORT_TYPES: ReportType[] = [
  'SCHEDULE_3',
  'INSTITUTIONAL_RISK',
  'ANNUAL_REPORT'
];

export interface ReportListItem {
  type: ReportType;
  fiscalYear: number;
  status: 'DRAFT' | 'APPROVED';
  preparedBy?: string | null;
  preparedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export interface ReportDue {
  type: ReportType;
  fiscalYear: number;
  label: string;
  status: 'NOT_STARTED' | 'DRAFT';
  dueOn: string;
  daysLeft: number;
}

export interface ReportRow {
  key: string;
  no: string;
  label: string;
  kind: 'STOCK' | 'FLOW' | 'AMOUNT' | 'TEXT' | 'YESNO';
  value?: number | string | null;
  previous?: number | null;
  change?: number | null;
  total?: number | string | null;
  remarks?: string | null;
  editable: boolean;
}

export interface ReportSection {
  key: string;
  title: string;
  rows: ReportRow[];
}

export interface Report {
  type: ReportType;
  fiscalYear: number;
  label: string;
  from: string;
  to: string;
  generatedOn: string;
  hasPrevious: boolean;
  sections: ReportSection[];
  status: 'DRAFT' | 'APPROVED';
  preparedBy?: string | null;
  preparedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  sha256?: string | null;
}

export interface Officer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  username?: string | null;
  appointedOn: string;
  boardDecision?: string | null;
  endedOn?: string | null;
  endReason?: string | null;
  notifiedFiuOn?: string | null;
  notifiedDepartmentOn?: string | null;
}

export interface BoardReview {
  id: number;
  periodFrom: string;
  periodTo: string;
  metOn: string;
  minuteReference?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  pack?: Record<string, number>;
}

export interface ActionPlan {
  id: number;
  fiscalYear: number;
  summary: string;
  approvedOn?: string | null;
  boardDecision?: string | null;
  fileName?: string | null;
}

export interface Declaration {
  id: number;
  personName: string;
  role: string;
  declaredOn: string;
  note?: string | null;
  fileName?: string | null;
}

export interface StaffAction {
  id: number;
  staffName: string;
  recommendation: string;
  recommendedOn: string;
  recommendedTo: 'CHIEF_EXECUTIVE' | 'BOARD';
  outcome?: string | null;
  outcomeOn?: string | null;
  fiuInformedOn?: string | null;
  departmentInformedOn?: string | null;
}

export interface Training {
  id: number;
  heldOn: string;
  topic: string;
  audience: 'STAFF' | 'BOARD' | 'OFFICER' | 'ALL';
  attendees?: number | null;
  attendeeNames?: string | null;
  givenBy?: string | null;
}

export interface Prompt {
  code: string;
  level: 'BAD' | 'WARN';
  dueOn?: string | null;
}

export interface Governance {
  officers: Officer[];
  reviews: BoardReview[];
  plans: ActionPlan[];
  declarations: Declaration[];
  trainings: Training[];
  staffActions?: StaffAction[];
  prompts: Prompt[];
  reviewDueOn?: string | null;
}

export const DECLARATION_ROLES = [
  'BOARD_CANDIDATE',
  'BOARD_MEMBER',
  'CHIEF_EXECUTIVE',
  'SENIOR_MANAGER',
  'COMPLIANCE_OFFICER',
  'OTHER'
];
export const AUDIENCES = [
  'STAFF',
  'BOARD',
  'OFFICER',
  'ALL'
];

@Injectable({ providedIn: 'root' })
export class GovernanceService {
  private http = inject(HttpClient);

  // ---- yearly reports

  reports(): Observable<{ reports: ReportListItem[]; due: ReportDue[] }> {
    return this.http.get<{ reports: ReportListItem[]; due: ReportDue[] }>('/nepal/aml/annual-reports');
  }

  report(type: ReportType, fiscalYear: number): Observable<Report> {
    return this.http.get<Report>(`/nepal/aml/annual-reports/${type}/${fiscalYear}`);
  }

  generate(type: ReportType, fiscalYear: number): Observable<Report> {
    return this.http.post<Report>(`/nepal/aml/annual-reports/${type}/${fiscalYear}/generate`, {});
  }

  edit(
    type: ReportType,
    fiscalYear: number,
    values: Record<string, string>,
    remarks: Record<string, string>
  ): Observable<Report> {
    return this.http.put<Report>(`/nepal/aml/annual-reports/${type}/${fiscalYear}`, { values, remarks });
  }

  approve(type: ReportType, fiscalYear: number): Observable<Report> {
    return this.http.post<Report>(`/nepal/aml/annual-reports/${type}/${fiscalYear}/approve`, {});
  }

  csv(type: ReportType, fiscalYear: number): Observable<Blob> {
    return this.http.get(`/nepal/aml/annual-reports/${type}/${fiscalYear}/csv`, { responseType: 'blob' });
  }

  // ---- governance

  governance(): Observable<Governance> {
    return this.http.get<Governance>('/nepal/aml/governance');
  }

  prompts(): Observable<Prompt[]> {
    return this.http.get<Prompt[]>('/nepal/aml/governance/prompts');
  }

  review(id: number): Observable<BoardReview> {
    return this.http.get<BoardReview>(`/nepal/aml/governance/reviews/${id}`);
  }

  appointOfficer(body: Record<string, string>): Observable<Governance> {
    return this.http.post<Governance>('/nepal/aml/governance/officers', body);
  }

  notified(officerId: number, to: 'FIU' | 'DEPARTMENT', on: string): Observable<Governance> {
    return this.http.post<Governance>(`/nepal/aml/governance/officers/${officerId}/notified`, { to, on });
  }

  recordReview(body: Record<string, string>): Observable<BoardReview> {
    return this.http.post<BoardReview>('/nepal/aml/governance/reviews', body);
  }

  addPlan(fields: Record<string, string>, file: File | null): Observable<Governance> {
    return this.http.post<Governance>('/nepal/aml/governance/plans', this.form(fields, file));
  }

  addDeclaration(fields: Record<string, string>, file: File | null): Observable<Governance> {
    return this.http.post<Governance>('/nepal/aml/governance/declarations', this.form(fields, file));
  }

  document(kind: 'plans' | 'declarations', id: number): Observable<Blob> {
    return this.http.get(`/nepal/aml/governance/${kind}/${id}/document`, { responseType: 'blob' });
  }

  addStaffAction(body: Record<string, string>): Observable<Governance> {
    return this.http.post<Governance>('/nepal/aml/governance/staff-actions', body);
  }

  staffActionOutcome(id: number, body: Record<string, string>): Observable<Governance> {
    return this.http.post<Governance>(`/nepal/aml/governance/staff-actions/${id}/outcome`, body);
  }

  addTraining(body: Record<string, string>): Observable<Governance> {
    return this.http.post<Governance>('/nepal/aml/governance/trainings', body);
  }

  private form(fields: Record<string, string>, file: File | null): FormData {
    const form = new FormData();
    Object.entries(fields).forEach(
      ([
        k,
        v
      ]) => form.append(k, v ?? '')
    );
    if (file) {
      form.append('file', file, file.name);
    }
    return form;
  }
}
