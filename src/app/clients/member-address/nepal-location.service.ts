/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';

import { NepalLocation } from './member-address.model';
import { NepalLocationIndex } from './nepal-location-index';

/**
 * Nepal's provinces, districts and local levels for the member address form.
 *
 * The backend sends the whole list in one response, so it is fetched once per session and shared by every address form.
 * Inactive local levels are included on purpose: an address saved before a merger must still show its old name.
 */
@Injectable({ providedIn: 'root' })
export class NepalLocationService {
  private readonly http = inject(HttpClient);
  private cached?: Observable<NepalLocationIndex>;

  locations(): Observable<NepalLocationIndex> {
    this.cached ??= this.http.get<NepalLocation[]>('/v1/nepal-locations').pipe(
      map((locations) => new NepalLocationIndex(locations ?? [])),
      catchError((error) => {
        // Let the next form try again rather than replaying the failure for the rest of the session.
        this.cached = undefined;
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.cached;
  }
}
