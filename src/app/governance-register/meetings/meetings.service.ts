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
import { Decision, Meeting, MeetingSummary } from './meetings.models';

const BASE = '/nepal/governance/meetings';

/** All calls under /v1/nepal/governance/meetings (fineract-dbug #141; docs/governance-meetings.md). */
@Injectable({ providedIn: 'root' })
export class MeetingsService {
  private http = inject(HttpClient);

  meetings(kind?: string, committeeId?: number, fiscalYear?: number): Observable<MeetingSummary[]> {
    let params = new HttpParams();
    if (kind) {
      params = params.set('kind', kind);
    }
    if (committeeId !== undefined) {
      params = params.set('committeeId', committeeId);
    }
    if (fiscalYear !== undefined) {
      params = params.set('fiscalYear', fiscalYear);
    }
    return this.http.get<MeetingSummary[]>(BASE, { params });
  }

  create(body: Record<string, unknown>): Observable<Meeting> {
    return this.http.post<Meeting>(BASE, body);
  }

  meeting(id: number): Observable<Meeting> {
    return this.http.get<Meeting>(`${BASE}/${id}`);
  }

  update(id: number, changes: Record<string, unknown>): Observable<Meeting> {
    return this.http.put<Meeting>(`${BASE}/${id}`, changes);
  }

  approve(id: number, approvedOn: string): Observable<Meeting> {
    return this.http.post<Meeting>(`${BASE}/${id}`, { approvedOn }, { params: { command: 'approve' } });
  }

  void(id: number, reason: string): Observable<Meeting> {
    return this.http.post<Meeting>(`${BASE}/${id}`, { reason }, { params: { command: 'void' } });
  }

  addMinutes(id: number, file: File): Observable<Meeting> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<Meeting>(`${BASE}/${id}/minutes`, form);
  }

  addCorrection(id: number, correction: string, decisionId: number | null, file: File | null): Observable<Meeting> {
    const form = new FormData();
    form.append('correction', correction);
    if (decisionId !== null) {
      form.append('decisionId', String(decisionId));
    }
    if (file) {
      form.append('file', file, file.name);
    }
    return this.http.post<Meeting>(`${BASE}/${id}/corrections`, form);
  }

  fileUrl(id: number): string {
    return `${BASE}/files/${id}`;
  }

  downloadFile(id: number): Observable<Blob> {
    return this.http.get(`${BASE}/files/${id}`, { responseType: 'blob' });
  }

  // ── decisions ──

  addDecision(meetingId: number, body: Record<string, unknown>): Observable<Meeting> {
    return this.http.post<Meeting>(`${BASE}/${meetingId}/decisions`, body);
  }

  updateDecision(id: number, body: Record<string, unknown>): Observable<Meeting> {
    return this.http.put<Meeting>(`${BASE}/decisions/${id}`, body);
  }

  voidDecision(id: number, reason: string): Observable<Meeting> {
    return this.http.post<Meeting>(`${BASE}/decisions/${id}`, { reason }, { params: { command: 'void' } });
  }

  decisions(body?: string, committeeId?: number, fiscalYear?: number, search?: string): Observable<Decision[]> {
    let params = new HttpParams();
    if (body) {
      params = params.set('body', body);
    }
    if (committeeId !== undefined) {
      params = params.set('committeeId', committeeId);
    }
    if (fiscalYear !== undefined) {
      params = params.set('fiscalYear', fiscalYear);
    }
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Decision[]>(`${BASE}/decisions`, { params });
  }

  decision(id: number): Observable<Decision> {
    return this.http.get<Decision>(`${BASE}/decisions/${id}`);
  }
}
