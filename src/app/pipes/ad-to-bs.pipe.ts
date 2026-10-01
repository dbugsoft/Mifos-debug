/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Pipe, PipeTransform, inject } from '@angular/core';
import { BsCalendarService } from 'app/core/bs-calendar/bs-calendar.service';

/**
 * Converts an AD date (from the Mifos API) to a Nepali BS date string, with the server's calendar table
 * (fineract-dbug ADR 0020).
 *
 * Accepts:
 *   number[]  – API tuple [year, month, day] with 1-indexed month
 *   Date      – JS Date object
 *   string    – ISO or locale date string
 *
 * Returns "D MonthName YYYY" (e.g. "12 Shrawan 2056"), or '' when the date is outside the BS calendar: an
 * out-of-range date is left blank, never guessed.
 */
@Pipe({ name: 'adToBs', standalone: true, pure: true })
export class AdToBsPipe implements PipeTransform {
  private bsCalendar = inject(BsCalendarService);

  transform(value: number[] | Date | string | null | undefined): string {
    return this.bsCalendar.formatLong(this.bsCalendar.toBs(value));
  }
}
