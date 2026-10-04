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
import { ActionCode, ActionPage, Filters, SectionName } from './coop-dashboard.models';

/** Reads the cooperative dashboard (fineract-dbug ADR 0021), one section per request. */
@Injectable({ providedIn: 'root' })
export class CoopDashboardService {
  private http = inject(HttpClient);

  filters(): Observable<Filters> {
    return this.http.get<Filters>('/nepal-dashboard/filters');
  }

  section<T>(name: SectionName, officeId: number | null, fiscalYear: number | null): Observable<T> {
    let params = new HttpParams();
    if (officeId) params = params.set('officeId', officeId);
    if (fiscalYear && name !== 'actions') params = params.set('fiscalYear', fiscalYear);
    return this.http.get<T>(`/nepal-dashboard/${name}`, { params });
  }

  /** One page of a task's records. */
  actionPage(
    code: ActionCode,
    officeId: number | null,
    page: { offset: number; limit: number; search?: string; sort?: string; direction?: string }
  ): Observable<ActionPage> {
    let params = new HttpParams().set('offset', page.offset).set('limit', page.limit);
    if (officeId) params = params.set('officeId', officeId);
    if (page.search) params = params.set('search', page.search);
    if (page.sort) params = params.set('sort', page.sort).set('direction', page.direction || 'asc');
    return this.http.get<ActionPage>(`/nepal-dashboard/actions/${code}`, { params });
  }
}
