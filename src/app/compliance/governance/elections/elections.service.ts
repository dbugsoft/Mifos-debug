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
import { Election, ElectionResultEntry, ElectionSummary, Voter } from './elections.models';

const BASE = '/nepal/governance/elections';

/** All calls under /v1/nepal/governance/elections (fineract-dbug #144; docs/governance-elections.md). */
@Injectable({ providedIn: 'root' })
export class ElectionsService {
  private http = inject(HttpClient);

  elections(): Observable<ElectionSummary[]> {
    return this.http.get<ElectionSummary[]>(BASE);
  }

  create(body: Record<string, unknown>): Observable<Election> {
    return this.http.post<Election>(BASE, body);
  }

  election(id: number): Observable<Election> {
    return this.http.get<Election>(`${BASE}/${id}`);
  }

  update(id: number, changes: Record<string, unknown>): Observable<Election> {
    return this.http.put<Election>(`${BASE}/${id}`, changes);
  }

  freezeRoll(id: number): Observable<Election> {
    return this.http.post<Election>(`${BASE}/${id}`, {}, { params: { command: 'freezeRoll' } });
  }

  publish(id: number): Observable<Election> {
    return this.http.post<Election>(`${BASE}/${id}`, {}, { params: { command: 'publish' } });
  }

  declare(
    id: number,
    body: {
      meetingId: number;
      decisionId?: number;
      termsStartOn: string | null;
      results: ElectionResultEntry[];
    }
  ): Observable<Election> {
    return this.http.post<Election>(`${BASE}/${id}`, body, { params: { command: 'declare' } });
  }

  cancel(id: number, reason: string): Observable<Election> {
    return this.http.post<Election>(`${BASE}/${id}`, { reason }, { params: { command: 'cancel' } });
  }

  voters(id: number, included: boolean, search?: string): Observable<Voter[]> {
    let params = new HttpParams().set('included', included);
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Voter[]>(`${BASE}/${id}/voters`, { params });
  }

  addNomination(id: number, body: Record<string, unknown>): Observable<Election> {
    return this.http.post<Election>(`${BASE}/${id}/nominations`, body);
  }

  withdrawNomination(nominationId: number, reason: string): Observable<Election> {
    return this.http.post<Election>(
      `${BASE}/nominations/${nominationId}`,
      { reason },
      { params: { command: 'withdraw' } }
    );
  }
}
