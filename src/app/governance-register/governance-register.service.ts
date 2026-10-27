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
import {
  Committee,
  Declaration,
  Director,
  DirectorsTable,
  Person,
  PersonDocument,
  PersonListItem,
  Position,
  PropertyDeclarations,
  Term
} from './governance-register.models';

const BASE = '/nepal/governance';

/** All calls under /v1/nepal/governance (fineract-dbug #138; docs/governance-register.md). */
@Injectable({ providedIn: 'root' })
export class GovernanceRegisterService {
  private http = inject(HttpClient);

  // ---- committees

  committees(asOf?: string, includeInactive = false): Observable<Committee[]> {
    let params = new HttpParams().set('includeInactive', includeInactive);
    if (asOf) {
      params = params.set('asOf', asOf);
    }
    return this.http.get<Committee[]>(`${BASE}/committees`, { params });
  }

  committee(id: number, asOf?: string): Observable<Committee> {
    const params = asOf ? new HttpParams().set('asOf', asOf) : undefined;
    return this.http.get<Committee>(`${BASE}/committees/${id}`, { params });
  }

  createCommittee(body: Record<string, unknown>): Observable<Committee> {
    return this.http.post<Committee>(`${BASE}/committees`, body);
  }

  updateCommittee(id: number, changes: Record<string, unknown>): Observable<Committee> {
    return this.http.put<Committee>(`${BASE}/committees/${id}`, changes);
  }

  // ---- positions

  positions(includeInactive = false): Observable<Position[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<Position[]>(`${BASE}/positions`, { params });
  }

  createPosition(body: Record<string, unknown>): Observable<Position> {
    return this.http.post<Position>(`${BASE}/positions`, body);
  }

  updatePosition(id: number, changes: Record<string, unknown>): Observable<Position> {
    return this.http.put<Position>(`${BASE}/positions/${id}`, changes);
  }

  // ---- people

  people(search?: string, current?: boolean, clientId?: number): Observable<PersonListItem[]> {
    let params = new HttpParams();
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    if (current !== undefined) {
      params = params.set('current', current);
    }
    if (clientId !== undefined) {
      params = params.set('clientId', clientId);
    }
    return this.http.get<PersonListItem[]>(`${BASE}/people`, { params });
  }

  person(id: number): Observable<Person> {
    return this.http.get<Person>(`${BASE}/people/${id}`);
  }

  createPerson(body: Record<string, unknown>): Observable<Person> {
    return this.http.post<Person>(`${BASE}/people`, body);
  }

  updatePerson(id: number, changes: Record<string, unknown>): Observable<Person> {
    return this.http.put<Person>(`${BASE}/people/${id}`, changes);
  }

  // ---- terms

  terms(committeeId?: number, personId?: number): Observable<Term[]> {
    let params = new HttpParams();
    if (committeeId !== undefined) {
      params = params.set('committeeId', committeeId);
    }
    if (personId !== undefined) {
      params = params.set('personId', personId);
    }
    return this.http.get<Term[]>(`${BASE}/terms`, { params });
  }

  addTerm(body: Record<string, unknown>): Observable<Term> {
    return this.http.post<Term>(`${BASE}/terms`, body);
  }

  endTerm(id: number, body: Record<string, unknown>): Observable<Term> {
    return this.http.post<Term>(`${BASE}/terms/${id}`, body, { params: { command: 'end' } });
  }

  changePosition(id: number, body: Record<string, unknown>): Observable<Term> {
    return this.http.post<Term>(`${BASE}/terms/${id}`, body, { params: { command: 'changePosition' } });
  }

  voidTerm(id: number, reason: string): Observable<Term> {
    return this.http.post<Term>(`${BASE}/terms/${id}`, { reason }, { params: { command: 'void' } });
  }

  // ---- directors' table

  directors(asOf?: string): Observable<DirectorsTable> {
    const params = asOf ? new HttpParams().set('asOf', asOf) : undefined;
    return this.http.get<DirectorsTable>(`${BASE}/directors`, { params });
  }

  // ---- a person's documents

  documents(personId: number): Observable<PersonDocument[]> {
    return this.http.get<PersonDocument[]>(`${BASE}/people/${personId}/documents`);
  }

  uploadDocument(personId: number, title: string, note: string | null, file: File): Observable<PersonDocument> {
    const form = new FormData();
    form.append('title', title);
    if (note) {
      form.append('note', note);
    }
    form.append('file', file, file.name);
    return this.http.post<PersonDocument>(`${BASE}/people/${personId}/documents`, form);
  }

  downloadDocument(id: number): Observable<Blob> {
    return this.http.get(`${BASE}/documents/${id}/file`, { responseType: 'blob' });
  }

  removeDocument(id: number, reason: string): Observable<unknown> {
    return this.http.post(`${BASE}/documents/${id}`, { reason }, { params: { command: 'remove' } });
  }

  // ---- declarations

  declarations(personId: number): Observable<Declaration[]> {
    return this.http.get<Declaration[]>(`${BASE}/people/${personId}/declarations`);
  }

  addDeclaration(personId: number, fields: Record<string, string>, file: File): Observable<Declaration> {
    const form = new FormData();
    Object.entries(fields).forEach(
      ([
        k,
        v
      ]) => {
        if (v) {
          form.append(k, v);
        }
      }
    );
    form.append('file', file, file.name);
    return this.http.post<Declaration>(`${BASE}/people/${personId}/declarations`, form);
  }

  downloadDeclaration(id: number): Observable<Blob> {
    return this.http.get(`${BASE}/declarations/${id}/file`, { responseType: 'blob' });
  }

  voidDeclaration(id: number, reason: string): Observable<unknown> {
    return this.http.post(`${BASE}/declarations/${id}`, { reason }, { params: { command: 'void' } });
  }

  // ---- who has declared

  propertyDeclarations(fiscalYear?: number): Observable<PropertyDeclarations> {
    const params = fiscalYear !== undefined ? new HttpParams().set('fiscalYear', fiscalYear) : undefined;
    return this.http.get<PropertyDeclarations>(`${BASE}/property-declarations`, { params });
  }
}
