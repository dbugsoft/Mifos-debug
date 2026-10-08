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

/** Politically exposed persons and the occupation and area tables (fineract-dbug #200, #129; docs/politically-exposed-persons.md). */

export type PepStatus = 'IN_OFFICE' | 'LEFT_OFFICE' | 'PAST_RETENTION';

export interface Pep {
  id: number;
  clientId: number | null;
  familyMemberId: number | null;
  fullName: string;
  citizenshipNo: string | null;
  dateOfBirth: string | null;
  category: string;
  postId: number | null;
  post: string | null;
  postDetail: string | null;
  startedOn: string | null;
  leftOfficeOn: string | null;
  source: string;
  evidence: string | null;
  retainUntil: string | null;
  createdAt: string;
  createdBy: string;
  members: number;
  status: PepStatus;
  links?: PepLink[];
}

export interface PepLink {
  id: number;
  clientId: number;
  name: string;
  accountNo: string;
  relationship: 'SELF' | 'FAMILY' | 'ASSOCIATE';
  relationshipDetail: string | null;
  since: string;
  endedAt: string | null;
  endReason: string | null;
}

export interface PepSuggestion {
  suggestionKey: string;
  from: 'KYM' | 'OCCUPATION' | 'FAMILY_OCCUPATION';
  fullName: string;
  clientId: number | null;
  familyMemberId: number | null;
  post: string | null;
  memberId: number;
  memberName: string;
  accountNo: string;
  relationship: 'SELF' | 'FAMILY' | 'ASSOCIATE';
  relationshipDetail: string | null;
}

export interface PepTemplate {
  posts: { id: number; name: string }[];
  categories: string[];
  sources: string[];
  relationships: string[];
  retentionYears: number;
}

export interface OccupationRisk {
  occupationId: number;
  occupation: string;
  grade: Grade | null;
  pepOccupation: boolean;
  note: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface AreaRisk {
  level: 'DISTRICT' | 'LOCAL_LEVEL';
  code: string;
  grade: Grade;
  note: string | null;
  name: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

@Injectable({ providedIn: 'root' })
export class PepService {
  private http = inject(HttpClient);

  list(status: PepStatus | 'ALL', search?: string): Observable<Pep[]> {
    let params = new HttpParams().set('status', status);
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Pep[]>('/nepal/aml/peps', { params });
  }

  template(): Observable<PepTemplate> {
    return this.http.get<PepTemplate>('/nepal/aml/peps/template');
  }

  suggestions(): Observable<PepSuggestion[]> {
    return this.http.get<PepSuggestion[]>('/nepal/aml/peps/suggestions');
  }

  dismiss(key: string, reason: string): Observable<unknown> {
    return this.http.post(`/nepal/aml/peps/suggestions/${encodeURIComponent(key)}/dismiss`, { reason });
  }

  get(id: number): Observable<Pep> {
    return this.http.get<Pep>(`/nepal/aml/peps/${id}`);
  }

  create(body: Record<string, unknown>): Observable<Pep> {
    return this.http.post<Pep>('/nepal/aml/peps', body);
  }

  update(id: number, changes: Record<string, unknown>): Observable<Pep> {
    return this.http.put<Pep>(`/nepal/aml/peps/${id}`, changes);
  }

  link(id: number, clientId: number, relationship: string, relationshipDetail?: string): Observable<Pep> {
    return this.http.post<Pep>(`/nepal/aml/peps/${id}/links`, {
      clientId,
      relationship,
      relationshipDetail: relationshipDetail || null
    });
  }

  endLink(id: number, linkId: number, reason: string): Observable<Pep> {
    return this.http.post<Pep>(`/nepal/aml/peps/${id}/links/${linkId}/end`, { reason });
  }

  occupations(): Observable<OccupationRisk[]> {
    return this.http.get<OccupationRisk[]>('/nepal/aml/occupations');
  }

  setOccupation(
    occupationId: number,
    grade: Grade | null,
    pepOccupation: boolean,
    note?: string
  ): Observable<OccupationRisk[]> {
    return this.http.put<OccupationRisk[]>(`/nepal/aml/occupations/${occupationId}`, {
      grade,
      pepOccupation,
      note: note || null
    });
  }

  areas(): Observable<AreaRisk[]> {
    return this.http.get<AreaRisk[]>('/nepal/aml/areas');
  }

  setArea(level: string, code: string, grade: Grade | null, note?: string): Observable<AreaRisk[]> {
    return this.http.put<AreaRisk[]>('/nepal/aml/areas', { level, code, grade, note: note || null });
  }

  regradeAll(): Observable<{ members: number; failed: number }> {
    return this.http.post<{ members: number; failed: number }>('/nepal/aml/risk/recompute', {});
  }
}
