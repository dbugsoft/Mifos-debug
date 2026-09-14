/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

/** Fineract's code for "the signed-in user's password must be changed before anything else". */
export const PASSWORD_OUTDATED_CODE = 'error.msg.password.outdated';

/** True when a Fineract error body says the signed-in user's password must be changed first. */
export function isPasswordOutdatedError(body: unknown): boolean {
  const error = body as {
    userMessageGlobalisationCode?: string;
    errors?: Array<{ userMessageGlobalisationCode?: string }>;
  } | null;

  if (error?.userMessageGlobalisationCode === PASSWORD_OUTDATED_CODE) {
    return true;
  }

  return (
    Array.isArray(error?.errors) && error.errors.some((e) => e?.userMessageGlobalisationCode === PASSWORD_OUTDATED_CODE)
  );
}

/**
 * Single source of truth for "a password change is required before the user may do anything else".
 *
 * Set when sign-in answers shouldRenewPassword (FINERACT-2003: 403 on basic auth) or when any call fails with
 * error.msg.password.outdated; cleared after a successful change and re-sign-in, or on sign-out. Deliberately not
 * persisted: a reload goes through sign-in again, which detects it again.
 *
 * Kept separate from AuthenticationService so the HTTP error interceptor can use it without a circular dependency.
 */
@Injectable({ providedIn: 'root' })
export class PasswordRenewalService {
  private readonly requiredSubject = new BehaviorSubject<boolean>(false);

  readonly required$: Observable<boolean> = this.requiredSubject.pipe(distinctUntilChanged());

  get required(): boolean {
    return this.requiredSubject.value;
  }

  require(): void {
    this.requiredSubject.next(true);
  }

  clear(): void {
    this.requiredSubject.next(false);
  }
}
