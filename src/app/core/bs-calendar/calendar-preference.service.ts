/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type CalendarName = 'BS' | 'AD';

/** The server's answer: the cooperative's default, the staff member's own choice, and the one to use. */
export interface CalendarSetting {
  cooperativeDefault: CalendarName;
  mine: CalendarName | null;
  effective: CalendarName;
}

/**
 * Which calendar the signed-in staff member sees and types dates in (fineract-dbug ADR 0020). BS until the server says
 * otherwise; loaded after sign-in.
 */
@Injectable({ providedIn: 'root' })
export class CalendarPreferenceService {
  private http = inject(HttpClient);

  readonly setting = signal<CalendarSetting>({ cooperativeDefault: 'BS', mine: null, effective: 'BS' });
  readonly calendar = computed(() => this.setting().effective);

  load(): void {
    this.http.get<CalendarSetting>('/nepal/calendar-setting').subscribe({
      next: (setting) => this.setting.set(setting),
      error: () => {
        /* Keep BS, the default. */
      }
    });
  }

  /** Your own calendar; null follows the cooperative's default. */
  setMine(calendar: CalendarName | null): Observable<CalendarSetting> {
    return this.http
      .put<CalendarSetting>('/nepal/calendar-setting/mine', { calendar })
      .pipe(tap((setting) => this.setting.set(setting)));
  }

  setCooperativeDefault(calendar: CalendarName): Observable<CalendarSetting> {
    return this.http
      .put<CalendarSetting>('/nepal/calendar-setting/cooperative', { calendar })
      .pipe(tap((setting) => this.setting.set(setting)));
  }
}
