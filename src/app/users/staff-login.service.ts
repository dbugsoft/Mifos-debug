/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthenticationService } from '../core/authentication/authentication.service';

/** A staff account's sign-in state (fineract-dbug ADR 0019, section 5). */
export interface LoginStatus {
  userId: number;
  username: string;
  administrator: boolean;
  locked: boolean;
  failedLoginAttempts: number;
  emailVerificationRequired: boolean;
  emailVerified: boolean;
  maskedEmail: string;
}

/**
 * The administrator's side of staff sign-in: which accounts are locked or have an unverified email, unlocking them,
 * and sending a verification code for someone who calls for help.
 */
@Injectable({ providedIn: 'root' })
export class StaffLoginService {
  private http = inject(HttpClient);
  private authenticationService = inject(AuthenticationService);

  /** Whether the signed-in user may see sign-in state, following the rules of the mifosxHasPermission directive. */
  canRead(): boolean {
    return this.has('READ_NEPALUSERLOGIN');
  }

  canUnlock(): boolean {
    return this.has('UNLOCK_NEPALUSERLOGIN');
  }

  /** Sending a verification code needs the permission that also corrects a user's email. */
  canSendCode(): boolean {
    return this.has('UPDATE_USER');
  }

  statuses(): Observable<LoginStatus[]> {
    return this.http.get<LoginStatus[]>('/nepal/users/login-status');
  }

  status(userId: number | string): Observable<LoginStatus> {
    return this.http.get<LoginStatus>(`/nepal/users/${userId}/login-status`);
  }

  unlock(userId: number | string): Observable<unknown> {
    return this.http.post(`/nepal/users/${userId}/unlock`, {});
  }

  sendVerificationCode(userId: number | string): Observable<{ maskedEmail: string; validMinutes: number }> {
    return this.http.post<{ maskedEmail: string; validMinutes: number }>(
      `/nepal/users/${userId}/email-verification/send`,
      {}
    );
  }

  /** Whether an address is free to be verified by this user (another staff member may already have verified it). */
  isEmailAvailable(email: string, userId?: number | string): Observable<{ available: boolean }> {
    let params = new HttpParams().set('email', email);
    if (userId !== undefined && userId !== null) {
      params = params.set('userId', String(userId));
    }
    return this.http.get<{ available: boolean }>('/nepal/staff-email/availability', { params });
  }

  private has(permission: string): boolean {
    const permissions: string[] = this.authenticationService.getCredentials()?.permissions ?? [];
    return (
      permissions.includes('ALL_FUNCTIONS') ||
      permissions.includes(permission) ||
      (permission.startsWith('READ_') && permissions.includes('ALL_FUNCTIONS_READ'))
    );
  }
}

/**
 * Flags an email another staff member has already verified ({ emailTaken: true }), checked shortly after typing
 * stops. If the check itself fails, nothing is flagged: the server refuses a taken address anyway.
 */
export function emailAvailableValidator(
  staffLogins: StaffLoginService,
  userId: () => number | string | undefined
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const email = (control.value ?? '').trim();
    if (!email || control.hasError('email')) {
      return of(null);
    }
    return timer(400).pipe(
      switchMap(() => staffLogins.isEmailAvailable(email, userId())),
      map((answer) => (answer.available ? null : { emailTaken: true })),
      catchError(() => of(null))
    );
  };
}
