/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { BUNDLED_BS_CALENDAR, BsCalendarTable } from './bs-calendar.data';

/** A Bikram Sambat date. `month` is 1 (Baishakh) to 12 (Chaitra). */
export interface BsDate {
  year: number;
  month: number;
  day: number;
}

export const BS_MONTHS = [
  'Baishakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra'
];

const DAY_MS = 86400000;
/** Nepal is UTC+5:45 all year. "Today" is Nepal's today, whatever the device's clock or time zone says. */
const NEPAL_TIME_ZONE = 'Asia/Kathmandu';

/**
 * Converts between Bikram Sambat (BS) and AD with the server's own calendar table (fineract-dbug ADR 0020), so a date
 * shown or typed here always matches what the server stores. Starts from a copy of the table built into the app and
 * switches to the server's table once signed in, if the two ever differ. Dates outside the table give null: they are
 * never guessed.
 */
@Injectable({ providedIn: 'root' })
export class BsCalendarService {
  private http = inject(HttpClient);

  private readonly table = signal<BsCalendarTable>(BUNDLED_BS_CALENDAR);
  private daysBeforeYear: number[] = [];
  private firstDayUtc = 0;

  constructor() {
    this.index(BUNDLED_BS_CALENDAR);
  }

  /** Fetches the server's table and uses it from now on if it differs from the built-in copy. */
  refreshFromServer(): void {
    this.http.get<BsCalendarTable>('/nepal/bs-calendar').subscribe({
      next: (server) => {
        if (server?.checksum && server.checksum !== this.table().checksum && Array.isArray(server.monthDays)) {
          console.warn(
            'BS calendar: using the server table',
            server.checksum,
            'instead of the built-in',
            this.table().checksum
          );
          this.index(server);
          this.table.set(server);
        }
      },
      error: () => {
        /* Keep the built-in table; it is the same table the server was released with. */
      }
    });
  }

  get minYear(): number {
    return this.table().firstYear;
  }

  get maxYear(): number {
    return this.table().firstYear + this.table().monthDays.length - 1;
  }

  /** True when the BS year's calendar is a projection, not yet published. */
  isProvisional(year: number): boolean {
    return year > this.table().publishedThroughYear;
  }

  daysInMonth(year: number, month: number): number | null {
    const row = this.table().monthDays[year - this.minYear];
    return row && month >= 1 && month <= 12 ? row[month - 1] : null;
  }

  /** The AD date (local midnight) for a BS date, or null when the BS date doesn't exist or is outside the table. */
  toAd(bs: BsDate | null | undefined): Date | null {
    if (!bs) return null;
    const days = this.daysInMonth(bs.year, bs.month);
    if (days === null || bs.day < 1 || bs.day > days) return null;
    let offset = this.daysBeforeYear[bs.year - this.minYear];
    const row = this.table().monthDays[bs.year - this.minYear];
    for (let m = 1; m < bs.month; m++) offset += row[m - 1];
    const utc = new Date(this.firstDayUtc + (offset + bs.day - 1) * DAY_MS);
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  }

  /**
   * The BS date for an AD date, or null when the AD date is outside the table.
   * Accepts a Date, the API's [year, month, day] tuple, or an ISO date string.
   */
  toBs(value: Date | number[] | string | null | undefined): BsDate | null {
    const utc = this.toUtcDay(value);
    if (utc === null) return null;
    let remaining = Math.round((utc - this.firstDayUtc) / DAY_MS);
    if (remaining < 0 || remaining >= this.daysBeforeYear[this.daysBeforeYear.length - 1]) return null;
    let yearIndex = 0;
    while (this.daysBeforeYear[yearIndex + 1] <= remaining) yearIndex++;
    remaining -= this.daysBeforeYear[yearIndex];
    const row = this.table().monthDays[yearIndex];
    let month = 1;
    while (remaining >= row[month - 1]) {
      remaining -= row[month - 1];
      month++;
    }
    return { year: this.minYear + yearIndex, month, day: remaining + 1 };
  }

  /** Today in Nepal, in BS. */
  todayBs(): BsDate | null {
    return this.toBs(this.todayInNepal());
  }

  /** Today's date in Nepal as an AD date (local midnight). */
  todayInNepal(): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: NEPAL_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
    const [
      y,
      m,
      d
    ] = parts.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /** "15 Ashwin 2050" */
  formatLong(bs: BsDate | null): string {
    return bs ? `${bs.day} ${BS_MONTHS[bs.month - 1]} ${bs.year}` : '';
  }

  /** "2050-06-15", the form the server stores and validates. */
  formatIso(bs: BsDate | null): string | null {
    if (!bs) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${bs.year}-${pad(bs.month)}-${pad(bs.day)}`;
  }

  /** Reads "2050-06-15" back into a BsDate, or null if it isn't one. */
  parseIso(value: string | null | undefined): BsDate | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
    if (!match) return null;
    const bs = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    return this.toAd(bs) ? bs : null;
  }

  private toUtcDay(value: Date | number[] | string | null | undefined): number | null {
    if (!value) return null;
    if (Array.isArray(value)) {
      return value.length >= 3 ? Date.UTC(value[0], value[1] - 1, value[2]) : null;
    }
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  private index(table: BsCalendarTable): void {
    const [
      y,
      m,
      d
    ] = table.firstDayAd.split('-').map(Number);
    this.firstDayUtc = Date.UTC(y, m - 1, d);
    let total = 0;
    this.daysBeforeYear = [0];
    for (const row of table.monthDays) {
      total += row.reduce((sum, days) => sum + days, 0);
      this.daysBeforeYear.push(total);
    }
  }
}
