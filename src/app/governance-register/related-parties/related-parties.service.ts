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
import { LoanReport, PersonParties, RelatedPartiesRegister } from './related-parties.models';

const BASE = '/nepal/governance/related-parties';

/** All calls under /v1/nepal/governance/related-parties (fineract-dbug #139; docs/related-parties.md). */
@Injectable({ providedIn: 'root' })
export class RelatedPartiesService {
  private http = inject(HttpClient);

  register(): Observable<RelatedPartiesRegister> {
    return this.http.get<RelatedPartiesRegister>(BASE);
  }

  loans(): Observable<LoanReport> {
    return this.http.get<LoanReport>(`${BASE}/loans`);
  }

  person(personId: number): Observable<PersonParties> {
    return this.http.get<PersonParties>(`${BASE}/people/${personId}`);
  }

  addLink(personId: number, body: Record<string, unknown>): Observable<PersonParties> {
    return this.http.post<PersonParties>(`${BASE}/people/${personId}/links`, body);
  }

  removeLink(id: number, reason: string): Observable<PersonParties> {
    return this.http.post<PersonParties>(`${BASE}/links/${id}`, { reason }, { params: { command: 'remove' } });
  }

  setLogin(personId: number, userId: number | null): Observable<PersonParties> {
    return this.http.put<PersonParties>(`${BASE}/people/${personId}/login`, { userId });
  }
}
