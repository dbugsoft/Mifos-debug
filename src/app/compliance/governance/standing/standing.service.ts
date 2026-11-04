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
import { Employee, Listing } from './standing.models';

const BASE = '/nepal/governance/standing';

/** All calls under /v1/nepal/governance/standing (fineract-dbug #144; docs/governance-elections.md). */
@Injectable({ providedIn: 'root' })
export class StandingService {
  private http = inject(HttpClient);

  // ---- blacklist

  blacklist(clientId?: number): Observable<Listing[]> {
    const params = clientId !== undefined ? new HttpParams().set('clientId', clientId) : undefined;
    return this.http.get<Listing[]>(`${BASE}/blacklist`, { params });
  }

  addListing(fields: Record<string, string>, file: File | null): Observable<Listing> {
    return this.http.post<Listing>(`${BASE}/blacklist`, this.form(fields, file));
  }

  removeListing(id: number, removedOn: string): Observable<Listing> {
    return this.http.post<Listing>(`${BASE}/blacklist/${id}`, { removedOn }, { params: { command: 'remove' } });
  }

  voidListing(id: number, reason: string): Observable<Listing> {
    return this.http.post<Listing>(`${BASE}/blacklist/${id}`, { reason }, { params: { command: 'void' } });
  }

  listingFile(id: number): Observable<Blob> {
    return this.http.get(`${BASE}/blacklist/${id}/file`, { responseType: 'blob' });
  }

  // ---- staff and members

  employees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${BASE}/employees`);
  }

  linkEmployee(staffId: number, clientId: number | null): Observable<Employee> {
    return this.http.put<Employee>(`${BASE}/employees/${staffId}`, { clientId });
  }

  private form(fields: Record<string, string>, file: File | null): FormData {
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
    if (file) {
      form.append('file', file, file.name);
    }
    return form;
  }
}
