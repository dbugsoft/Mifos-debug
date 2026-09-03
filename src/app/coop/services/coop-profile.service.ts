/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with
 * this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

export interface CoopProfile {
  coopRegdNo: string;
  nameNp: string;
  nameEn: string;
  dateOfRegistered: string;
  panNo: string;
  provinceId: number | null;
  districtId: number | null;
  localLevelId: number | null;
  wardNo: number | null;
  tole: string;
  houseNo: string;
  mobilePhone: string;
  officePhone: string;
  logoUrl: string;
  status?: string;
  about: string;
  remarks: string;
}

export interface CoopLocation {
  id: number;
  combinedCode: string;

  provinceCode: string;
  provinceNameEn: string;
  provinceNameNp: string;

  districtCode: string;
  districtNameEn: string;
  districtNameNp: string;

  localLevelCode: string;
  localLevelNameEn: string;
  localLevelNameNp: string;

  ecologicalBelt: string;
  totalWard: number;
  isActive: boolean;
}
export interface CoopMe {
  emailVerified: boolean;
  phone: string;
  userId: number;
  status: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class CoopProfileService {
  private http = inject(HttpClient);

  private readonly profileUrl = `${environment.coopApiUrl}/nepal/coop-registration/public/profile`;

  private readonly locationsUrl = `${environment.coopApiUrl}/nepal/coop-registration/public/locations`;

  /*
   * Existing in-memory cache.
   *
   * This prevents repeated API calls while
   * the Angular application is running.
   */
  private locationsCache$: Observable<CoopLocation[]> | null = null;

  /*
   * Persistent browser cache.
   *
   * This survives browser refresh.
   */
  private readonly locationsStorageKey = 'coop_locations_cache';

  private readonly meUrl = `${environment.coopApiUrl}/nepal/coop-registration/public/me`;
  // =====================================================
  // PROFILE
  // =====================================================

  createProfile(profile: CoopProfile): Observable<CoopProfile> {
    return this.http.post<CoopProfile>(this.profileUrl, profile);
  }

  getProfile(): Observable<CoopProfile> {
    const params = new HttpParams().set('_t', Date.now().toString());

    return this.http.get<CoopProfile>(this.profileUrl, { params });
  }

  updateProfile(profile: Partial<CoopProfile>): Observable<CoopProfile> {
    return this.http.patch<CoopProfile>(this.profileUrl, profile);
  }

  getMe(): Observable<CoopMe> {
    console.log('GET ME API CALLED:', this.meUrl);

    return this.http.get<CoopMe>(this.meUrl).pipe(
      tap((response) => {
        console.log('GET ME API RESPONSE IN SERVICE:', response);
      })
    );
  }
  // =====================================================
  // LOCATIONS
  // =====================================================

  getLocations(): Observable<CoopLocation[]> {
    /*
     * ===================================================
     * 1. EXISTING MEMORY CACHE
     * ===================================================
     *
     * If locations are already loaded during the
     * current Angular session, use them directly.
     */

    if (this.locationsCache$) {
      console.log('LOCATIONS: Using memory cache');

      return this.locationsCache$;
    }

    /*
     * ===================================================
     * 2. LOCAL STORAGE CACHE
     * ===================================================
     *
     * Browser refresh destroys the Angular memory cache.
     *
     * Therefore, check localStorage next.
     */

    const cachedLocations = localStorage.getItem(this.locationsStorageKey);

    if (cachedLocations) {
      try {
        const locations = JSON.parse(cachedLocations) as CoopLocation[];

        /*
         * Make sure cached data is actually
         * a valid non-empty array.
         */

        if (Array.isArray(locations) && locations.length > 0) {
          console.log('LOCATIONS: Using localStorage cache', locations.length);

          /*
           * Convert cached data to Observable.
           *
           * shareReplay(1) keeps the existing behaviour
           * for multiple subscribers.
           */

          this.locationsCache$ = of(locations).pipe(shareReplay(1));

          return this.locationsCache$;
        }
      } catch (error) {
        /*
         * If cached JSON is corrupted,
         * remove it and fetch fresh data.
         */

        console.warn('LOCATIONS: Invalid localStorage cache. Removing it.', error);

        localStorage.removeItem(this.locationsStorageKey);
      }
    }

    /*
     * ===================================================
     * 3. NO CACHE → API REQUEST
     * ===================================================
     *
     * This happens only when:
     *
     * - first time application is opened
     * - cache was manually cleared
     * - cached data was invalid
     */

    console.log('LOCATIONS: Calling API');

    this.locationsCache$ = this.http.get<CoopLocation[]>(this.locationsUrl).pipe(
      /*
       * =================================================
       * SAVE API RESPONSE TO LOCAL STORAGE
       * =================================================
       */

      tap((locations) => {
        console.log('LOCATIONS: API response received', locations.length);

        try {
          localStorage.setItem(this.locationsStorageKey, JSON.stringify(locations));

          console.log('LOCATIONS: Saved to localStorage');
        } catch (error) {
          /*
           * localStorage can fail if storage is full
           * or browser storage is unavailable.
           *
           * This should NOT break the application.
           */

          console.warn('LOCATIONS: Unable to save to localStorage.', error);
        }
      }),

      /*
       * Existing behaviour.
       *
       * Multiple subscribers reuse the same response.
       */

      shareReplay(1)
    );

    return this.locationsCache$;
  }

  // =====================================================
  // CLEAR LOCATION CACHE
  // =====================================================

  clearLocationsCache(): void {
    /*
     * Clear existing Angular memory cache.
     */

    this.locationsCache$ = null;

    /*
     * Also clear browser persistent cache.
     */

    localStorage.removeItem(this.locationsStorageKey);

    console.log('LOCATIONS: Cache cleared');
  }
}
