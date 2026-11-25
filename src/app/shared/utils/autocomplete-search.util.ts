/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Observable, catchError, of, startWith, switchMap } from 'rxjs';

/** Searches start once at least this many characters are typed. */
export const MIN_SEARCH_LENGTH = 2;

/**
 * The results for a search-as-you-type autocomplete input, as an Observable.
 * Emits null while there is nothing to show (fewer than 2 characters typed, a search still running, or an
 * option already picked), and the result list (possibly empty) once the search for the current text returns.
 * switchMap drops a slower earlier search, so the list never shows results for older text (fineract-dbug #334).
 * Turn it into a signal with toSignal(..., { initialValue: null }) so OnPush views re-render on each result.
 */
export function autocompleteResults<T>(
  values: Observable<unknown>,
  search: (text: string) => Observable<T[]>
): Observable<T[] | null> {
  return values.pipe(
    switchMap((value) => {
      const text = typeof value === 'string' ? value.trim() : '';
      if (text.length < MIN_SEARCH_LENGTH) {
        return of(null);
      }
      return search(text).pipe(
        startWith(null),
        catchError(() => of([]))
      );
    })
  );
}

/**
 * The option picked from an autocomplete, or null while the input only holds typed text.
 * An autocomplete control holds the typed string until an option is picked, so `control.value` alone is not
 * a picked item (fineract-dbug #334: typed text was shown and added as a blank member).
 */
export function pickedOption<T extends { id?: unknown }>(value: unknown): T | null {
  return value !== null && typeof value === 'object' && (value as T).id != null ? (value as T) : null;
}
