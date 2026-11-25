/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Subject, of, throwError } from 'rxjs';
import { autocompleteResults, pickedOption } from './autocomplete-search.util';

describe('autocompleteResults', () => {
  it('clears results below 2 characters and while a search runs, and drops older searches', () => {
    const typed = new Subject<unknown>();
    const pending: Record<string, Subject<string[]>> = {};
    const seen: (string[] | null)[] = [];
    autocompleteResults(typed, (text) => (pending[text] = new Subject<string[]>())).subscribe((r) => seen.push(r));

    typed.next('yo');
    pending['yo'].next(['yocahi zura']);
    typed.next('x');
    typed.next('kr');
    typed.next('kri');
    pending['kr'].next(['stale']);
    pending['kri'].next([]);
    typed.next({ id: 7, displayName: 'Picked' });

    expect(seen).toEqual([
      null,
      ['yocahi zura'],
      null,
      null,
      null,
      [],
      null
    ]);
  });

  it('shows no results when the search fails', () => {
    const seen: unknown[] = [];
    autocompleteResults(of('abc'), () => throwError(() => new Error('down'))).subscribe((r) => seen.push(r));
    expect(seen).toEqual([
      null,
      []
    ]);
  });
});

describe('pickedOption', () => {
  it('is only a picked object with an id, never typed text', () => {
    expect(pickedOption('kris')).toBeNull();
    expect(pickedOption('')).toBeNull();
    expect(pickedOption(null)).toBeNull();
    expect(pickedOption({ displayName: 'no id' })).toBeNull();
    expect(pickedOption({ id: 0 })).toEqual({ id: 0 });
  });
});
