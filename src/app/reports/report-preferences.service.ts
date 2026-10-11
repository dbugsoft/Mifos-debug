/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';

/** Custom Services */
import { AuthenticationService } from 'app/core/authentication/authentication.service';

/** Number of recently run reports kept. */
const RECENT_LIMIT = 10;

/** A user's report shortcuts, as stored in the browser. */
interface ReportPreferences {
  /** Favourite report ids. */
  favourites: number[];
  /** Recently run report ids, most recent first. */
  recent: number[];
}

/**
 * Favourite and recently run reports of the signed-in user, kept in this browser only.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportPreferencesService {
  private authenticationService = inject(AuthenticationService);

  /** Favourite report ids. */
  get favourites(): number[] {
    return this.read().favourites;
  }

  /** Recently run report ids, most recent first. */
  get recent(): number[] {
    return this.read().recent;
  }

  /**
   * @param {number} reportId Report id.
   * @returns {boolean} Whether the report is a favourite.
   */
  isFavourite(reportId: number): boolean {
    return this.favourites.includes(Number(reportId));
  }

  /**
   * Adds the report to favourites, or removes it if already there.
   * @param {number} reportId Report id.
   */
  toggleFavourite(reportId: number) {
    const id = Number(reportId);
    const preferences = this.read();
    preferences.favourites = preferences.favourites.includes(id)
      ? preferences.favourites.filter((favourite) => favourite !== id)
      : [
          ...preferences.favourites,
          id
        ];
    this.write(preferences);
  }

  /**
   * Moves the report to the top of the recently run list.
   * @param {number} reportId Report id.
   */
  addRecent(reportId: number) {
    const id = Number(reportId);
    if (!id) {
      return;
    }
    const preferences = this.read();
    preferences.recent = [
      id,
      ...preferences.recent.filter((recent) => recent !== id)
    ].slice(0, RECENT_LIMIT);
    this.write(preferences);
  }

  /** Storage key, per user so a shared browser keeps separate shortcuts. */
  private get storageKey(): string {
    const credentials = this.authenticationService.getCredentials();
    return `mifosXReportPreferences-${credentials?.userId ?? 'anonymous'}`;
  }

  private read(): ReportPreferences {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey));
      return {
        favourites: Array.isArray(stored?.favourites) ? stored.favourites : [],
        recent: Array.isArray(stored?.recent) ? stored.recent : []
      };
    } catch {
      return { favourites: [], recent: [] };
    }
  }

  private write(preferences: ReportPreferences) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(preferences));
    } catch {
      /** Storage unavailable (private mode, quota): shortcuts just won't persist. */
    }
  }
}
