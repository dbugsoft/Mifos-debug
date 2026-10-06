/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import {
  MembersWithoutShares,
  MembershipApplication,
  MembershipApplyRequest,
  MembershipSettings,
  MembershipSettingsView,
  MembershipStatus,
  MembershipTemplate
} from './membership.models';

/**
 * Membership applications (fineract-dbug ADR 0023): a person becomes a member by buying shares. Applying creates a
 * pending client; approving activates the member, opens the member savings account and buys the shares in one step.
 */
@Injectable({ providedIn: 'root' })
export class MembershipService {
  private http = inject(HttpClient);
  private authenticationService = inject(AuthenticationService);

  /**
   * Whether the signed-in user may read memberships. Checked before calling, because the global error handler
   * shows an alert for every refused call, and a user without the permission should simply see the old screens.
   */
  canRead(): boolean {
    const permissions: string[] = this.authenticationService.getCredentials()?.permissions ?? [];
    return [
      'ALL_FUNCTIONS',
      'ALL_FUNCTIONS_READ',
      'READ_MEMBERSHIP'
    ].some((p) => permissions.includes(p));
  }

  template(): Observable<MembershipTemplate> {
    return this.http.get<MembershipTemplate>('/nepal/memberships/template');
  }

  /**
   * The template when this user may read memberships, else null. Membership mode is on when
   * {@code template.settings.shareFirstEnabled}; a user without READ_MEMBERSHIP works as before.
   */
  templateOrNull(): Observable<MembershipTemplate | null> {
    return this.canRead() ? this.template().pipe(catchError(() => of(null))) : of(null);
  }

  apply(request: MembershipApplyRequest): Observable<MembershipApplication> {
    return this.http.post<MembershipApplication>('/nepal/memberships', request);
  }

  list(status: MembershipStatus): Observable<MembershipApplication[]> {
    return this.http.get<MembershipApplication[]>('/nepal/memberships', {
      params: new HttpParams().set('status', status.toLowerCase())
    });
  }

  /** The member's application whatever its status, or null when there is none (or the user may not read it). */
  forClient(clientId: number | string): Observable<MembershipApplication | null> {
    if (!this.canRead()) {
      return of(null);
    }
    return this.http
      .get<
        MembershipApplication[]
      >('/nepal/memberships', { params: new HttpParams().set('clientId', String(clientId)) })
      .pipe(
        map((applications) => applications[0] ?? null),
        catchError(() => of(null))
      );
  }

  get(id: number): Observable<MembershipApplication> {
    return this.http.get<MembershipApplication>(`/nepal/memberships/${id}`);
  }

  /** {@code date} is yyyy-MM-dd; today when left out. */
  approve(id: number, date?: string): Observable<MembershipApplication> {
    return this.http.post<MembershipApplication>(`/nepal/memberships/${id}`, date ? { date } : {}, {
      params: new HttpParams().set('command', 'approve')
    });
  }

  reject(id: number, reason: string, date?: string): Observable<MembershipApplication> {
    return this.http.post<MembershipApplication>(`/nepal/memberships/${id}`, date ? { reason, date } : { reason }, {
      params: new HttpParams().set('command', 'reject')
    });
  }

  membersWithoutShares(): Observable<MembersWithoutShares> {
    return this.http.get<MembersWithoutShares>('/nepal/memberships/members-without-shares');
  }

  settings(): Observable<MembershipSettingsView> {
    return this.http.get<MembershipSettingsView>('/nepal/memberships/settings');
  }

  updateSettings(settings: Partial<MembershipSettings>): Observable<MembershipSettingsView> {
    return this.http.put<MembershipSettingsView>('/nepal/memberships/settings', settings);
  }
}
