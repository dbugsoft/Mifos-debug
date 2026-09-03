/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CoopAdminStatus = 'PENDING' | 'PROVISIONED' | 'ACTIVE' | 'REJECTED';

/**
 * Shape returned by list / get-by-id / verify / reject /
 * activate - all four admin endpoints return this same
 * cooperative object, differing only in which optional
 * fields are present (the backend omits null fields
 * rather than sending them as null).
 */
export interface CoopAdminRegistration {
  id: number;
  appUserId: number;
  coopRegdNo: string;
  cooperativeCode: string;
  nameNp: string;
  nameEn: string;
  dateOfRegistered: string;
  panNo: string;
  provinceId: number;
  districtId: number;
  localLevelId: number;
  wardNo: number;
  tole?: string;
  houseNo?: string;
  mobilePhone: string;
  officePhone?: string;
  logoUrl?: string;
  webUrl?: string;
  about?: string;
  remarks?: string;
  status: CoopAdminStatus;
  adminRemarks?: string;
  tenantIdentifier?: string;
  provisionedAt?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoopAdminListParams {
  status?: CoopAdminStatus;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CoopAdminVerifyRequest {
  remarks: string;
}

export interface CoopAdminRejectRequest {
  reason: string;
}

export interface CoopAdminStats {
  PENDING: number;
  PROVISIONED: number;
  ACTIVE: number;
  REJECTED: number;
}

/**
 * Plain HTTP access for Coop admin data.
 *
 * This service intentionally does NOT cache anything - server-state
 * caching (in-memory storage, staleness, per-mutation invalidation)
 * is owned entirely by TanStack Query, wired up in
 * ../queries/coop-admin.queries.ts and consumed via
 * injectQuery()/injectMutation() in the components.
 */
@Injectable({
  providedIn: 'root'
})
export class CoopAdminService {
  private http = inject(HttpClient);

  /**
   * NOTE: intentionally NOT under /public - these
   * endpoints require an ADMIN-role Authorization
   * header, which coopAuthInterceptor attaches
   * automatically for any coop-registration URL that
   * isn't in its public-endpoint allowlist.
   */
  private readonly baseUrl = `${environment.coopApiUrl}/nepal/coop-registration/admin`;

  /**
   * GET /admin?status=&q=&limit=&offset=
   *
   * Retrieves the cooperative list, optionally filtered
   * by status and/or a free-text search term, with
   * simple offset-based pagination.
   */
  getCooperatives(params: CoopAdminListParams = {}): Observable<CoopAdminRegistration[]> {
    let httpParams = new HttpParams();

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    if (params.q) {
      httpParams = httpParams.set('q', params.q);
    }

    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit);
    }

    if (params.offset !== undefined) {
      httpParams = httpParams.set('offset', params.offset);
    }

    return this.http.get<CoopAdminRegistration[]>(this.baseUrl, { params: httpParams });
  }

  /**
   * GET /admin/{id}
   *
   * Full detail for a single cooperative.
   */
  getCooperativeById(id: number): Observable<CoopAdminRegistration> {
    return this.http.get<CoopAdminRegistration>(`${this.baseUrl}/${id}`);
  }

  /**
   * POST /admin/{id}/verify
   *
   * Verifies the cooperative and provisions its tenant.
   * Valid only while status is PENDING; on success the
   * response's status becomes PROVISIONED and includes
   * tenantIdentifier / provisionedAt.
   */
  verifyCooperative(id: number, remarks: string): Observable<CoopAdminRegistration> {
    const body: CoopAdminVerifyRequest = { remarks };

    return this.http.post<CoopAdminRegistration>(`${this.baseUrl}/${id}/verify`, body);
  }

  /**
   * POST /admin/{id}/reject
   *
   * Valid only while status is PENDING; on success the
   * response's status becomes REJECTED.
   */
  rejectCooperative(id: number, reason: string): Observable<CoopAdminRegistration> {
    const body: CoopAdminRejectRequest = { reason };

    return this.http.post<CoopAdminRegistration>(`${this.baseUrl}/${id}/reject`, body);
  }

  /**
   * POST /admin/{id}/activate
   *
   * Valid only while status is PROVISIONED; on success
   * the response's status becomes ACTIVE and includes
   * activatedAt. No request body.
   */
  activateCooperative(id: number): Observable<CoopAdminRegistration> {
    return this.http.post<CoopAdminRegistration>(`${this.baseUrl}/${id}/activate`, {});
  }

  /**
   * GET /admin/stats
   *
   * Cooperative counts grouped by status, for the
   * dashboard summary cards.
   */
  getStats(): Observable<CoopAdminStats> {
    return this.http.get<CoopAdminStats>(`${this.baseUrl}/stats`);
  }
}
