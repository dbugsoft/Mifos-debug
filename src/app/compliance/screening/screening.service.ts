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
 * Sanctions screening and freezes (fineract-dbug #130, #202, #203; docs/sanctions-screening.md). Fineract leaves null
 * fields out of its answers, so a field typed `| null` may also be missing.
 */

export type ListSource = 'UN' | 'HOME_MINISTRY' | 'OTHER';
export type HitStatus = 'OPEN' | 'NOT_A_MATCH' | 'CONFIRMED' | 'CLEARED';
export type Level = 'LIKELY' | 'POSSIBLE';

export interface ListVersion {
  id: number;
  source: ListSource;
  publishedOn: string | null;
  fileName: string | null;
  entries: number;
  added: number | null;
  removed: number | null;
  changed: number | null;
  current: boolean;
  loadedBy: string | null;
  loadedAt: string;
}

export interface Lists {
  versions: ListVersion[];
  unUrl: string;
  lastUnCheck: { at: string; note: string } | null;
  lastRun: {
    id: number;
    reason: string;
    screened: number;
    newMatches: number;
    cleared: number;
    startedAt: string;
    finishedAt: string | null;
    note: string | null;
  } | null;
}

export interface LoadResult {
  listId: number;
  unchanged: boolean;
  entries?: number;
  added?: number | null;
  removed?: number | null;
  changed?: number | null;
  screening?: { screened: number; newMatches: number; cleared: number; failed?: number };
}

export interface HitRow {
  id: number;
  subjectType: 'MEMBER' | 'FAMILY' | 'OWNER';
  subjectName: string;
  clientId: number;
  memberName: string;
  accountNo: string;
  office: string;
  source: ListSource;
  reference: string;
  entryName: string;
  closestName: string;
  score: number;
  level: Level;
  status: HitStatus;
  clearedWhy: string | null;
  foundAt: string;
}

export interface HitGroup {
  source: ListSource;
  reference: string;
  entryName: string;
  bestScore: number;
  level: Level;
  matches: HitRow[];
}

export interface Compared {
  detail: 'NAME' | 'BIRTH' | 'DOCUMENT';
  ours: string | null;
  theirs: string | null;
  result: 'SAME' | 'CLOSE' | 'DIFFERENT' | 'MISSING';
}

export interface Hit {
  id: number;
  status: HitStatus;
  score: number;
  level: Level;
  source: ListSource;
  reference: string;
  foundAt: string;
  clearedWhy: string | null;
  reason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  compared: Compared[];
  freeze: { id: number; status: 'ACTIVE' | 'RELEASED' } | null;
  ours: {
    type: 'MEMBER' | 'FAMILY' | 'OWNER';
    name: string;
    bornOn?: string | null;
    relationship?: string | null;
    citizenshipNo?: string | null;
    documents?: { type: string | null; number: string }[];
    member: {
      clientId: number;
      name: string;
      accountNo: string;
      office: string;
      status: number;
      bornOn: string | null;
    };
  };
  entry: {
    reference: string;
    person: boolean;
    name: string;
    aliases: string | null;
    originalScript: string | null;
    bornOn: string | null;
    bornYears: string | null;
    nationality: string | null;
    documents: string | null;
    listedOn: string | null;
    note: string | null;
    source: ListSource;
    listPublishedOn: string | null;
    listId: number;
    onCurrentList: boolean;
  } | null;
  others: { id: number; subjectName: string; score: number; status: HitStatus }[];
}

export interface MemberMatch {
  id: number;
  subjectType: string;
  subjectName: string;
  source: ListSource;
  reference: string;
  closestName: string;
  score: number;
  status: HitStatus;
  reason: string | null;
  foundAt: string;
}

export interface FreezeAccount {
  id: number;
  accountNo: string;
  product: string;
  balance: number;
  status: number;
  blocked: boolean;
  blockReason: string | null;
}

export interface Freeze {
  id: number;
  clientId: number;
  name: string;
  accountNo: string;
  hitId: number;
  subjectName: string;
  source: ListSource;
  reference: string;
  caseId: number | null;
  caseReference: string | null;
  status: 'ACTIVE' | 'RELEASED';
  reason: string;
  frozenBy: string;
  frozenAt: string;
  releasedBy: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  accounts?: FreezeAccount[];
  blockedByThisFreeze?: number[];
}

export interface ScreeningSummary {
  open: number;
  likely: number;
  confirmed: number;
  lists: { source: ListSource; loadedAt: string; entries: number }[];
}

@Injectable({ providedIn: 'root' })
export class ScreeningService {
  private http = inject(HttpClient);

  summary(): Observable<ScreeningSummary> {
    return this.http.get<ScreeningSummary>('/nepal/aml/screening/summary');
  }

  lists(): Observable<Lists> {
    return this.http.get<Lists>('/nepal/aml/screening/lists');
  }

  template(): Observable<Blob> {
    return this.http.get('/nepal/aml/screening/lists/template', { responseType: 'blob' });
  }

  upload(source: ListSource, file: File): Observable<LoadResult> {
    const form = new FormData();
    form.append('source', source);
    form.append('file', file, file.name);
    return this.http.post<LoadResult>('/nepal/aml/screening/lists', form);
  }

  downloadUn(): Observable<LoadResult> {
    return this.http.post<LoadResult>('/nepal/aml/screening/lists/un/download', {});
  }

  screenAll(): Observable<{ screened: number; newMatches: number; cleared: number }> {
    return this.http.post<{ screened: number; newMatches: number; cleared: number }>(
      '/nepal/aml/screening/screen-all',
      {}
    );
  }

  hits(status: string): Observable<HitGroup[]> {
    return this.http.get<HitGroup[]>('/nepal/aml/screening/hits', { params: { status } });
  }

  hit(id: number): Observable<Hit> {
    return this.http.get<Hit>(`/nepal/aml/screening/hits/${id}`);
  }

  decide(id: number, decision: 'NOT_A_MATCH' | 'CONFIRMED', reason: string): Observable<Hit> {
    return this.http.post<Hit>(`/nepal/aml/screening/hits/${id}/decide`, { decision, reason });
  }

  notAMatchAll(hitIds: number[], reason: string): Observable<{ decided: number }> {
    return this.http.post<{ decided: number }>('/nepal/aml/screening/hits/not-a-match', { hitIds, reason });
  }

  member(clientId: number): Observable<MemberMatch[]> {
    return this.http.get<MemberMatch[]>(`/nepal/aml/screening/members/${clientId}`);
  }

  freezes(status: string): Observable<Freeze[]> {
    return this.http.get<Freeze[]>('/nepal/aml/screening/freezes', { params: { status } });
  }

  freeze(id: number): Observable<Freeze> {
    return this.http.get<Freeze>(`/nepal/aml/screening/freezes/${id}`);
  }

  release(id: number, reason: string): Observable<Freeze> {
    return this.http.post<Freeze>(`/nepal/aml/screening/freezes/${id}/release`, { reason });
  }
}
