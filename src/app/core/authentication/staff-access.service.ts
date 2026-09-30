/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

/** Sign-in refused because the staff member has not yet proved their email address (fineract-dbug ADR 0019). */
export const EMAIL_NOT_VERIFIED_CODE = 'error.msg.user.email.not.verified';
/** Sign-in refused because the account was locked after too many wrong passwords. */
export const ACCOUNT_LOCKED_CODE = 'error.msg.user.account.locked';

/** The first globalisation code in a Fineract error body, top-level or nested. */
export function fineractErrorCode(body: unknown): string | undefined {
  const error = body as {
    userMessageGlobalisationCode?: string;
    errors?: Array<{ userMessageGlobalisationCode?: string }>;
  } | null;
  return error?.userMessageGlobalisationCode || error?.errors?.[0]?.userMessageGlobalisationCode;
}

/** The first user-facing message in a Fineract error body. */
export function fineractErrorMessage(body: unknown): string | undefined {
  const error = body as {
    defaultUserMessage?: string;
    errors?: Array<{ defaultUserMessage?: string }>;
  } | null;
  return error?.errors?.[0]?.defaultUserMessage || error?.defaultUserMessage;
}

/** Calls whose screens show their own errors on the sign-in card, so the global error pop-up stays quiet. */
export function isStaffAccessUrl(url: string): boolean {
  return url.includes('/nepal/password-reset/') || url.includes('/nepal/staff-email/verification/');
}

/** A sign-in the backend refused with a reason the sign-in card explains itself. */
export function isHandledSignInRefusal(url: string, body: unknown): boolean {
  const code = fineractErrorCode(body);
  return url.endsWith('/authentication') && (code === EMAIL_NOT_VERIFIED_CODE || code === ACCOUNT_LOCKED_CODE);
}

/** What the sign-in card shows in place of the sign-in form. */
export type SignInHelp =
  | { kind: 'verifyEmail'; username: string; password: string; maskedEmail: string }
  | { kind: 'resetPassword'; username: string };

export interface CodeSent {
  maskedEmail: string;
  validMinutes: number;
}

/**
 * Staff sign-in help from fineract-dbug ADR 0019: verifying one's email before the first sign-in, and resetting a
 * forgotten password with a code sent to that verified address (which also unlocks a locked account).
 */
@Injectable({ providedIn: 'root' })
export class StaffAccessService {
  private http = inject(HttpClient);

  /** The help step the sign-in card is showing, or null for the ordinary sign-in form. */
  readonly step = signal<SignInHelp | null>(null);
  /** A username for the sign-in form to fill in, after a password reset. */
  readonly signInAs = signal('');

  showVerifyEmail(username: string, password: string, maskedEmail: string): void {
    this.step.set({ kind: 'verifyEmail', username, password, maskedEmail });
  }

  showResetPassword(username = ''): void {
    this.step.set({ kind: 'resetPassword', username });
  }

  backToSignIn(username = ''): void {
    this.signInAs.set(username);
    this.step.set(null);
  }

  /** Emails a verification code. Signs in with the typed credentials, as the account isn't usable yet. */
  sendVerificationCode(username: string, password: string): Observable<CodeSent> {
    return this.http.post<CodeSent>('/nepal/staff-email/verification/send', {}, { headers: basic(username, password) });
  }

  confirmVerificationCode(username: string, password: string, code: string): Observable<unknown> {
    return this.http.post('/nepal/staff-email/verification/confirm', { code }, { headers: basic(username, password) });
  }

  /** Always answers with the same message, whether or not the account exists or can reset. */
  requestPasswordReset(username: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/nepal/password-reset/request', { username });
  }

  confirmPasswordReset(reset: {
    username: string;
    code: string;
    password: string;
    repeatPassword: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/nepal/password-reset/confirm', reset);
  }
}

function basic(username: string, password: string): HttpHeaders {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return new HttpHeaders({ Authorization: `Basic ${btoa(binary)}` });
}
