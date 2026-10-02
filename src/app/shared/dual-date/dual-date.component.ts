/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { BsCalendarService } from 'app/core/bs-calendar/bs-calendar.service';
import { CalendarPreferenceService } from 'app/core/bs-calendar/calendar-preference.service';

/**
 * A date in the staff member's calendar, with the same date in the other calendar beside or under it
 * (fineract-dbug ADR 0020): "15 Ashwin 2050 (1 Oct 1993)". Used where staff compare a record against a document.
 * A date the BS calendar doesn't cover is shown in AD only.
 */
@Component({
  selector: 'mifosx-dual-date',
  standalone: true,
  template: `
    @if (primary()) {
      <span class="dual-date__primary">{{ primary() }}</span>
      @if (secondary()) {
        <span class="dual-date__secondary" [class.dual-date__secondary--below]="stacked()">{{ secondary() }}</span>
      }
      @if (provisional()) {
        <span class="dual-date__provisional" title="This year's BS calendar isn't published yet">(provisional)</span>
      }
    } @else {
      <span class="dual-date__empty">{{ empty() }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: inline;
      }

      .dual-date__secondary {
        margin-left: 0.35em;
        color: var(--mat-sys-on-surface-variant, #757575);
        font-size: 0.85em;
      }

      .dual-date__secondary:not(.dual-date__secondary--below)::before {
        content: '(';
      }

      .dual-date__secondary:not(.dual-date__secondary--below)::after {
        content: ')';
      }

      .dual-date__secondary--below {
        display: block;
        margin-left: 0;
      }

      .dual-date__provisional {
        margin-left: 0.35em;
        color: var(--mat-sys-on-surface-variant, #757575);
        font-size: 0.8em;
        font-style: italic;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DualDateComponent {
  private bsCalendar = inject(BsCalendarService);
  private preference = inject(CalendarPreferenceService);

  /** An AD date: the API's [year, month, day] tuple, a Date, or an ISO string. */
  readonly date = input<number[] | Date | string | null | undefined>(null);
  /** Show the other calendar on its own line instead of in brackets. */
  readonly stacked = input(false);
  /** Shown when there is no date. */
  readonly empty = input('');

  private readonly ad = computed(() => {
    const value = this.date();
    if (!value) return null;
    const parts = Array.isArray(value) ? value : value instanceof Date ? [
            value.getFullYear(),
            value.getMonth() + 1,
            value.getDate()
          ] : /^(\d{4})-(\d{2})-(\d{2})/.exec(value)?.slice(1).map(Number);
    return parts && parts.length >= 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
  });

  private readonly adText = computed(
    () => this.ad()?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) ?? ''
  );
  private readonly bs = computed(() => this.bsCalendar.toBs(this.ad()));
  private readonly bsText = computed(() => this.bsCalendar.formatLong(this.bs()));

  readonly primary = computed(() =>
    this.preference.calendar() === 'BS' && this.bsText() ? this.bsText() : this.adText()
  );
  readonly secondary = computed(() => {
    if (!this.bsText()) return '';
    return this.preference.calendar() === 'BS' ? this.adText() : this.bsText();
  });
  readonly provisional = computed(() => !!this.bs() && this.bsCalendar.isProvisional(this.bs()!.year));
}
