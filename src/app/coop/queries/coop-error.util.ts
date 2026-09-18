/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Extracts a user-facing message from a failed HTTP request, whether it
 * reached a component via a rejected Promise (TanStack Query) or an
 * Observable error - both surface the same HttpErrorResponse shape.
 */
export function extractCoopErrorMessage(error: unknown, fallback: string): string {
  const httpError = error as
    { error?: { message?: string; error?: string; defaultUserMessage?: string } } | null | undefined;

  return httpError?.error?.message || httpError?.error?.error || httpError?.error?.defaultUserMessage || fallback;
}
