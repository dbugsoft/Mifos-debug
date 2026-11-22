/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, shareReplay, tap } from 'rxjs';
import { ComplianceToday } from '../compliance.models';

/** What a login lacks to work as compliance officer, and whether the register knows the member they are. */
export interface OfficerLogin {
  userId?: number;
  username?: string;
  /** Of READ_AMLCOMPLIANCE, MANAGE_AMLCASE, FILE_GOAML. */
  missing?: string[];
  loginEnabled?: boolean;
  /** Linked to a member in the governance register: the family rule can cover them. */
  memberLinked?: boolean;
}

export interface CurrentOfficer extends OfficerLogin {
  id: number;
  name: string;
  appointedOn: string;
  boardDecision?: string;
  notifiedFiuOn?: string;
  notifiedDepartmentOn?: string;
}

export interface OfficerCover extends OfficerLogin {
  id: number;
  name: string;
  fromOn: string;
  toOn: string;
  lastDay: string;
  endedEarly: boolean;
  status: 'NOW' | 'LATER' | 'OVER';
  boardDecision?: string;
  endReason?: string;
}

/** The compliance officer as the system sees them (fineract-dbug ADR-0064, docs/compliance-officer.md). */
export interface OfficerView {
  officer?: CurrentOfficer;
  covers: OfficerCover[];
  workingAs?: { name: string; userId?: number; username?: string; acting: boolean; until?: string };
  me: { officer: boolean; acting: boolean };
  chiefExecutive?: { name: string; username?: string };
  othersWhoFile?: { userId: number; username: string; name: string }[];
  othersWhoDecide?: number;
}

export interface Handover extends OfficerView {
  asOf: string;
  openCases: {
    id: number;
    reference: string;
    clientId?: number;
    name?: string;
    summary: string;
    status: string;
    openedOn?: string;
    reportDueOn?: string;
  }[];
  today: ComplianceToday;
  lastReview?: { metOn: string; periodFrom: string; periodTo: string; minuteReference?: string; notes?: string };
}

export interface StaffLogin {
  id: number;
  username: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class OfficerService {
  private http = inject(HttpClient);
  private view$?: Observable<OfficerView | null>;

  /** The last answer, for the line at the top of every compliance page. */
  readonly view = signal<OfficerView | null>(null);

  /** Asked once per session; a change here asks again. Without access the line is simply not shown. */
  load(): Observable<OfficerView | null> {
    this.view$ ??= this.http.get<OfficerView>('/nepal/aml/officer').pipe(
      catchError(() => of(null)),
      tap((v) => this.view.set(v)),
      shareReplay(1)
    );
    return this.view$;
  }

  refresh(): Observable<OfficerView | null> {
    this.view$ = undefined;
    return this.load();
  }

  handover(): Observable<Handover> {
    return this.http.get<Handover>('/nepal/aml/officer/handover');
  }

  logins(): Observable<StaffLogin[]> {
    return this.http.get<StaffLogin[]>('/nepal/aml/officer/logins');
  }

  cover(body: {
    name: string;
    userId?: number | null;
    fromOn: string;
    toOn: string;
    boardDecision?: string;
  }): Observable<OfficerView> {
    return this.http.post<OfficerView>('/nepal/aml/officer/covers', body).pipe(tap((v) => this.changed(v)));
  }

  endCover(id: number, on: string, reason: string): Observable<OfficerView> {
    return this.http
      .post<OfficerView>('/nepal/aml/officer/covers/' + id + '/end', { on, reason })
      .pipe(tap((v) => this.changed(v)));
  }

  private changed(v: OfficerView): void {
    this.view.set(v);
    this.view$ = of(v);
  }
}
