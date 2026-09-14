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

export type CoopAdminStatus = 'PENDING' | 'PROVISIONED' | 'ACTIVE' | 'REJECTED' | 'WITHDRAWN';

/** Outcome of the most recent sign-in details email. */
export type AccessEmailStatus = 'SENT' | 'FAILED' | 'NOT_CONFIGURED';

/**
 * Shape returned by list / get-by-id / verify / reject /
 * activate and the tenant access endpoints - all return this
 * same cooperative object, differing only in which optional
 * fields are present (the backend omits null fields
 * rather than sending them as null).
 */
export interface CoopAdminRegistration {
  /** The registration row's own id. Display only: no admin endpoint accepts it. */
  id: number;
  /** The registry account id. Every admin endpoint addresses a cooperative by this. */
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
  /** The cooperative's own public website, as the applicant typed it. Not where they sign in. */
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
  totalMaleMembers?: number;
  totalFemaleMembers?: number;
  totalOtherMembers?: number;

  // ---- tenant access handover ----
  /** The web address the cooperative signs in at. Set by a registry admin. */
  frontendUrl?: string;
  /** The managed administrator account, e.g. sajilo.admin.k7m2. Absent on tenants that predate this feature. */
  tenantAdminUsername?: string;
  accessEmailStatus?: AccessEmailStatus;
  accessEmailLastAttemptAt?: string;
  accessEmailSentAt?: string;
  tenantAccessResetAt?: string;
}

export type RemediationAction =
  | 'HARDEN_AND_RENAME'
  | 'HARDEN'
  | 'REPLACE_PASSWORD'
  | 'ENSURE_NEVER_EXPIRES'
  | 'DISABLE'
  | 'LEAVE_UNCHANGED'
  | 'NOT_PRESENT';

/** What remediation of a legacy tenant would do (dry run) or did. */
export interface TenantRemediationReport {
  tenantIdentifier: string;
  dryRun: boolean;
  administrator: { action: RemediationAction; username?: string };
  system: { action: RemediationAction };
  interopUser: { action: RemediationAction };
  /** True when applying replaces the login the cooperative uses today and emails them. */
  emailsCooperative: boolean;
  /** Present only on a real run that emailed the cooperative. */
  accessEmailStatus?: AccessEmailStatus;
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
  UNVERIFIED_EMAIL: number;
  PENDING: number;
  PROVISIONED: number;
  ACTIVE: number;
  REJECTED: number;
  WITHDRAWN: number;
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
   * GET /admin/{appUserId}
   *
   * Full detail for a single cooperative.
   */
  getCooperativeById(appUserId: number): Observable<CoopAdminRegistration> {
    return this.http.get<CoopAdminRegistration>(`${this.baseUrl}/${appUserId}`);
  }

  /**
   * POST /admin/{appUserId}/verify
   *
   * Verifies the cooperative and provisions its tenant.
   * Valid only while status is PENDING; on success the
   * response's status becomes PROVISIONED and includes
   * tenantIdentifier / tenantAdminUsername / provisionedAt.
   */
  verifyCooperative(appUserId: number, remarks: string): Observable<CoopAdminRegistration> {
    const body: CoopAdminVerifyRequest = { remarks };

    return this.http.post<CoopAdminRegistration>(`${this.baseUrl}/${appUserId}/verify`, body);
  }

  /**
   * POST /admin/{appUserId}/reject
   *
   * Valid only while status is PENDING; on success the
   * response's status becomes REJECTED.
   */
  rejectCooperative(appUserId: number, reason: string): Observable<CoopAdminRegistration> {
    const body: CoopAdminRejectRequest = { reason };

    return this.http.post<CoopAdminRegistration>(`${this.baseUrl}/${appUserId}/reject`, body);
  }

  /**
   * POST /admin/{appUserId}/activate
   *
   * Valid only while status is PROVISIONED. Enables the tenant
   * administrator and emails the cooperative its sign-in details
   * (never a password). frontendUrl is required unless one is
   * already saved. A failed email does not fail activation: check
   * accessEmailStatus on the response.
   */
  activateCooperative(appUserId: number, frontendUrl?: string): Observable<CoopAdminRegistration> {
    return this.http.post<CoopAdminRegistration>(
      `${this.baseUrl}/${appUserId}/activate`,
      frontendUrl ? { frontendUrl } : {}
    );
  }

  /**
   * PUT /admin/{appUserId}/frontend-url
   *
   * Saves the web address the cooperative signs in at.
   * Allowed while PROVISIONED or ACTIVE. The server returns
   * the normalised value.
   */
  setFrontendUrl(appUserId: number, frontendUrl: string): Observable<CoopAdminRegistration> {
    return this.http.put<CoopAdminRegistration>(`${this.baseUrl}/${appUserId}/frontend-url`, { frontendUrl });
  }

  /**
   * POST /admin/{appUserId}/access-email/resend
   *
   * ACTIVE only. Sends the sign-in details again; changes
   * nothing in the tenant.
   */
  resendAccessEmail(appUserId: number): Observable<CoopAdminRegistration> {
    return this.http.post<CoopAdminRegistration>(`${this.baseUrl}/${appUserId}/access-email/resend`, {});
  }

  /**
   * POST /admin/{appUserId}/tenant-access/reset
   *
   * ACTIVE only. The administrator's password becomes the
   * registrant's current registry password again, must be
   * changed at next sign-in, and the cooperative is emailed.
   * The reason is recorded in the audit log.
   */
  resetTenantAccess(appUserId: number, reason: string): Observable<CoopAdminRegistration> {
    return this.http.post<CoopAdminRegistration>(`${this.baseUrl}/${appUserId}/tenant-access/reset`, { reason });
  }

  /**
   * POST /admin/{appUserId}/tenant-access/remediate?dryRun=true
   *
   * Reports what retiring the default credentials on a legacy
   * tenant would do. Changes nothing.
   */
  checkTenantSecurity(appUserId: number): Observable<TenantRemediationReport> {
    return this.http.post<TenantRemediationReport>(`${this.baseUrl}/${appUserId}/tenant-access/remediate`, null, {
      params: new HttpParams().set('dryRun', 'true')
    });
  }

  /**
   * POST /admin/{appUserId}/tenant-access/remediate?dryRun=false
   *
   * Applies it. On an ACTIVE tenant still using the default
   * login, this replaces that login and emails the cooperative.
   */
  remediateTenant(appUserId: number): Observable<TenantRemediationReport> {
    return this.http.post<TenantRemediationReport>(`${this.baseUrl}/${appUserId}/tenant-access/remediate`, null, {
      params: new HttpParams().set('dryRun', 'false')
    });
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
