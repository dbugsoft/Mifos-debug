/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject
} from '@angular/core';
import { ControlValueAccessor, NgControl, UntypedFormControl, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { BS_MONTHS, BsCalendarService } from 'app/core/bs-calendar/bs-calendar.service';
import { CalendarName, CalendarPreferenceService } from 'app/core/bs-calendar/calendar-preference.service';

// Ported from Nepal-cms: packages/ui/src/components/BSDatePicker.tsx
const WEEKDAYS = [
  'S',
  'M',
  'T',
  'W',
  'T',
  'F',
  'S'
];

/** A BS date inside this component. `month` is 0-indexed here (0 = Baishakh), unlike BsCalendarService. */
type BsDate = { year: number; month: number; day: number };

/** A BsDate as 'YYYY-MM-DD', the form the backend stores and validates. Month is 0-indexed here. */
function formatBs(bs: BsDate | null): string | null {
  if (!bs) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${bs.year}-${pad(bs.month + 1)}-${pad(bs.day)}`;
}

/** Compare two BsDate objects: -1 | 0 | 1 */
function compareBs(a: BsDate, b: BsDate): number {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

const AD_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/**
 * Date field that takes a date in Bikram Sambat (BS) or AD (fineract-dbug ADR 0020): a ControlValueAccessor drop-in
 * for mat-datepicker.
 *
 *   <mifosx-nepali-date-input
 *     class="flex-13"
 *     label="Date of Birth"
 *     formControlName="dateOfBirth"
 *     [maxDate]="maxDate"
 *   />
 *
 * The parent FormControl always receives an AD JS Date (same type as mat-datepicker), whichever calendar was used.
 * A small BS | AD switch in the field picks the calendar; it starts on the staff member's calendar setting, or on
 * [calendar] when a form knows better (a passport is printed in AD). Below the field, the same date is shown in the
 * other calendar, so it can be checked against the document.
 *
 * Every conversion uses BsCalendarService, the server's own table, so nothing here can disagree with what the server
 * stores. A date outside that table is kept in AD only, never guessed.
 *
 * [minDate] and [maxDate] accept AD Date objects; they are converted to BS internally and enforced on navigation,
 * year select, and individual day buttons.
 */
@Component({
  selector: 'mifosx-nepali-date-input',
  templateUrl: './nepali-date-input.component.html',
  styleUrls: ['./nepali-date-input.component.scss'],
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NepaliDateInputComponent implements ControlValueAccessor, OnInit {
  @Input() label = 'Date (BS)';

  /**
   * The selected date in BS as 'YYYY-MM-DD', or null when cleared or outside the BS calendar.
   *
   * The FormControl still carries an AD Date, because that is what the rest of the form and the
   * age calculation expect. This emits the BS date alongside it so the form can keep the date the
   * user actually picked. The server converts it back and rejects it if the two disagree, so the
   * browser can never quietly become the source of truth.
   */
  @Output() readonly bsDateChange = new EventEmitter<string | null>();

  /** Which calendar the date was entered in, each time one is chosen: keep a BS original only for 'BS'. */
  @Output() readonly calendarUsed = new EventEmitter<CalendarName>();

  /** Start in this calendar instead of the staff member's setting, for example 'AD' for a passport. */
  @Input() calendar: CalendarName | null = null;

  // ── minDate / maxDate (AD) — converted to BS for internal use ─────────────

  private minBs: BsDate | null = null;
  private maxBs: BsDate | null = null;
  minDateAd: Date | null = null;
  maxDateAd: Date | null = null;

  @Input()
  set minDate(value: Date | null | undefined) {
    this.minDateAd = value ?? null;
    this.minBs = value ? this.adToBs(value) : null;
    this.cdr.markForCheck();
  }

  @Input()
  set maxDate(value: Date | null | undefined) {
    this.maxDateAd = value ?? null;
    this.maxBs = value ? this.adToBs(value) : null;
    this.cdr.markForCheck();
  }

  // Wire CVA using inject() with self+optional flags
  readonly ngControl = inject(NgControl, { optional: true, self: true });

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly el = inject(ElementRef);
  private readonly bsCalendar = inject(BsCalendarService);
  private readonly preference = inject(CalendarPreferenceService);

  readonly nepaliMonths = BS_MONTHS;
  readonly weekdays = WEEKDAYS;

  /** The calendar the field is showing. */
  mode: CalendarName = 'BS';
  /** Set once the staff member flips the switch, so a late-loading setting doesn't flip it back. */
  private modeChosen = false;

  panelOpen = false;
  panelTop = 0;
  panelLeft = 0;
  viewYear = 0;
  viewMonth = 0; // 0-indexed

  emptySlots: null[] = [];
  dayNumbers: number[] = [];

  selectedBs: BsDate | null = null;
  selectedAd: Date | null = null;

  /** Read-only display input for BS; user interacts only via the calendar panel */
  readonly bsInputControl = new UntypedFormControl('');
  /** Material datepicker input for AD */
  readonly adInputControl = new UntypedFormControl(null);

  @ViewChild('wrapper') wrapperRef!: ElementRef<HTMLElement>;
  @ViewChild('yearList') yearListRef?: ElementRef<HTMLElement>;

  pickerMode: 'days' | 'months' | 'years' = 'days';

  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    const today = this.todayBsInternal();
    this.viewYear = today?.year ?? this.bsCalendar.maxYear;
    this.viewMonth = today?.month ?? 0;
    this.recomputeCalendar();
    // Follow the calendar setting (it loads after sign-in) until the staff member flips the switch themselves.
    effect(() => {
      const preferred = this.preference.calendar();
      if (!this.modeChosen) {
        this.mode = this.calendar ?? preferred;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    if (this.calendar) this.mode = this.calendar;
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  get minBsYear(): number {
    return this.bsCalendar.minYear;
  }

  get maxBsYear(): number {
    return this.bsCalendar.maxYear;
  }

  get yearRange(): number[] {
    const lo = this.minBs?.year ?? this.minBsYear;
    const hi = this.maxBs?.year ?? this.maxBsYear;
    const out: number[] = [];
    for (let y = hi; y >= lo; y--) out.push(y);
    return out;
  }

  /** Prev-month button is disabled when the view is already at the min month. */
  get isAtMin(): boolean {
    if (this.minBs) {
      return this.viewYear === this.minBs.year && this.viewMonth === this.minBs.month;
    }
    return this.viewYear === this.minBsYear && this.viewMonth === 0;
  }

  /** Next-month button is disabled when the view is already at the max month. */
  get isAtMax(): boolean {
    if (this.maxBs) {
      return this.viewYear === this.maxBs.year && this.viewMonth === this.maxBs.month;
    }
    return this.viewYear === this.maxBsYear && this.viewMonth === 11;
  }

  get isRequired(): boolean {
    return this.ngControl?.control?.hasValidator(Validators.required) ?? false;
  }

  get hasRequiredError(): boolean {
    const ctrl = this.ngControl?.control;
    return !!(ctrl && ctrl.touched && ctrl.hasError('required'));
  }

  get isDisabled(): boolean {
    return this.bsInputControl.disabled;
  }

  /** The same date in the other calendar, shown under the field. */
  get otherCalendarHint(): string {
    if (!this.selectedAd) return '';
    if (this.mode === 'BS') {
      return `= ${this.selectedAd.toLocaleDateString('en-GB', AD_FORMAT)} AD`;
    }
    return this.selectedBs
      ? `= ${this.selectedBs.day} ${BS_MONTHS[this.selectedBs.month]} ${this.selectedBs.year} BS`
      : '';
  }

  /** The BS year's calendar is a projection that may still be corrected. */
  get isProvisional(): boolean {
    return !!this.selectedBs && this.bsCalendar.isProvisional(this.selectedBs.year);
  }

  /** An AD date the BS calendar doesn't cover: it is kept in AD only. */
  get isOutsideBsCalendar(): boolean {
    return !!this.selectedAd && !this.selectedBs;
  }

  /** A year like 2081 in AD mode is almost certainly a BS year typed into the wrong calendar. */
  get looksLikeBsYear(): boolean {
    return (
      this.mode === 'AD' &&
      !!this.selectedAd &&
      this.selectedAd.getFullYear() >= this.bsCalendar.todayInNepal().getFullYear() + 40
    );
  }

  /** True when the calendar day should be greyed out and not selectable. */
  isDayDisabled(day: number): boolean {
    const candidate: BsDate = { year: this.viewYear, month: this.viewMonth, day };
    if (this.minBs && compareBs(candidate, this.minBs) < 0) return true;
    if (this.maxBs && compareBs(candidate, this.maxBs) > 0) return true;
    return false;
  }

  /** Today button is disabled when today falls outside the allowed range. */
  get isTodayDisabled(): boolean {
    const todayBs = this.todayBsInternal();
    if (!todayBs) return true;
    if (this.minBs && compareBs(todayBs, this.minBs) < 0) return true;
    if (this.maxBs && compareBs(todayBs, this.maxBs) > 0) return true;
    return false;
  }

  // ── Calendar switch ────────────────────────────────────────────────────────

  setMode(calendar: CalendarName, event?: Event): void {
    event?.stopPropagation();
    this.modeChosen = true;
    this.mode = calendar;
    this.panelOpen = false;
    this.cdr.markForCheck();
  }

  // ── ControlValueAccessor ───────────────────────────────────────────────────

  writeValue(value: Date | string | null): void {
    if (!value) {
      this.clearState(false);
    } else {
      this.syncFromAd(value);
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.bsInputControl.disable();
      this.adInputControl.disable();
    } else {
      this.bsInputControl.enable();
      this.adInputControl.enable();
    }
    this.cdr.markForCheck();
  }

  // ── AD mode ────────────────────────────────────────────────────────────────

  /** A date chosen or typed in the AD datepicker. */
  onAdChosen(value: Date | null): void {
    if (!value || isNaN(value.getTime())) {
      this.clearState(true);
      return;
    }
    const adDate = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    this.selectedAd = adDate;
    this.selectedBs = this.adToBs(adDate);
    this.bsInputControl.setValue(this.selectedBs ? this.formatBsDisplay(this.selectedBs) : '', { emitEvent: false });
    this.onChange(adDate);
    this.bsDateChange.emit(formatBs(this.selectedBs));
    this.calendarUsed.emit('AD');
    this.cdr.markForCheck();
  }

  markTouched(): void {
    this.onTouched();
  }

  // ── Panel open/close ───────────────────────────────────────────────────────

  openPanel(): void {
    if (this.panelOpen || this.isDisabled) return;
    if (this.selectedBs) {
      this.viewYear = this.selectedBs.year;
      this.viewMonth = this.selectedBs.month;
    }
    // Clamp view to min/max so the panel always opens at a valid month
    if (this.minBs) {
      if (this.viewYear < this.minBs.year || (this.viewYear === this.minBs.year && this.viewMonth < this.minBs.month)) {
        this.viewYear = this.minBs.year;
        this.viewMonth = this.minBs.month;
      }
    }
    if (this.maxBs) {
      if (this.viewYear > this.maxBs.year || (this.viewYear === this.maxBs.year && this.viewMonth > this.maxBs.month)) {
        this.viewYear = this.maxBs.year;
        this.viewMonth = this.maxBs.month;
      }
    }
    this.pickerMode = 'days';
    this.recomputeCalendar();
    const rect = this.wrapperRef.nativeElement.getBoundingClientRect();
    const panelW = 264;
    const panelH = 310; // max height: header(36) + weekdays(26) + 6 rows×33px(198) + footer(36)
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Flip upward if the panel would overflow the bottom of the viewport
    this.panelTop = rect.bottom + 4 + panelH > vh ? rect.top - panelH - 4 : rect.bottom + 4;

    // Shift left if the panel would overflow the right edge of the viewport
    this.panelLeft = rect.left + panelW > vw ? vw - panelW - 8 : rect.left;

    this.panelOpen = true;
    this.cdr.markForCheck();
  }

  closePanel(): void {
    this.panelOpen = false;
    this.bsInputControl.markAsTouched();
    this.onTouched();
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.panelOpen && !this.el.nativeElement.contains(event.target as Node)) {
      this.closePanel();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.panelOpen) this.closePanel();
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  prevMonth(): void {
    if (this.viewMonth === 0) {
      this.viewYear--;
      this.viewMonth = 11;
    } else {
      this.viewMonth--;
    }
    this.recomputeCalendar();
    this.cdr.markForCheck();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) {
      this.viewYear++;
      this.viewMonth = 0;
    } else {
      this.viewMonth++;
    }
    this.recomputeCalendar();
    this.cdr.markForCheck();
  }

  onMonthChange(event: Event): void {
    this.viewMonth = Number((event.target as HTMLSelectElement).value);
    this.recomputeCalendar();
    this.cdr.markForCheck();
  }

  onYearChange(event: Event): void {
    this.selectViewYear(Number((event.target as HTMLSelectElement).value));
  }

  // ── Picker mode (month / year grid views) ──────────────────────────────────

  setPickerMode(mode: 'days' | 'months' | 'years'): void {
    this.pickerMode = mode;
    this.cdr.markForCheck();
    if (mode === 'years') {
      // After Angular renders the year grid, scroll the selected year into view
      setTimeout(() => {
        const el = this.yearListRef?.nativeElement.querySelector(
          `[data-year="${this.viewYear}"]`
        ) as HTMLElement | null;
        el?.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, 0);
    }
  }

  selectViewMonth(monthIdx: number): void {
    this.viewMonth = monthIdx;
    // Clamp to maxBs if needed
    if (this.maxBs && this.viewYear === this.maxBs.year && this.viewMonth > this.maxBs.month) {
      this.viewMonth = this.maxBs.month;
    }
    if (this.minBs && this.viewYear === this.minBs.year && this.viewMonth < this.minBs.month) {
      this.viewMonth = this.minBs.month;
    }
    this.recomputeCalendar();
    this.pickerMode = 'days';
    this.cdr.markForCheck();
  }

  selectViewYear(year: number): void {
    this.viewYear = year;
    // Clamp month into valid range for the new year
    if (this.minBs && this.viewYear === this.minBs.year && this.viewMonth < this.minBs.month) {
      this.viewMonth = this.minBs.month;
    }
    if (this.maxBs && this.viewYear === this.maxBs.year && this.viewMonth > this.maxBs.month) {
      this.viewMonth = this.maxBs.month;
    }
    this.recomputeCalendar();
    this.pickerMode = 'days';
    this.cdr.markForCheck();
  }

  // ── Day selection ──────────────────────────────────────────────────────────

  selectDay(day: number): void {
    if (this.isDayDisabled(day)) return; // guard against keyboard/programmatic calls
    const adDate = this.bsCalendar.toAd({ year: this.viewYear, month: this.viewMonth + 1, day });
    if (!adDate) return;

    this.selectedBs = { year: this.viewYear, month: this.viewMonth, day };
    this.selectedAd = adDate;
    this.bsInputControl.setValue(this.formatBsDisplay(this.selectedBs), { emitEvent: false });
    this.adInputControl.setValue(adDate, { emitEvent: false });

    this.onChange(adDate);
    this.bsDateChange.emit(formatBs(this.selectedBs));
    this.calendarUsed.emit('BS');
    this.closePanel();
  }

  clearDate(): void {
    this.clearState(true);
    this.closePanel();
  }

  selectToday(): void {
    if (this.isTodayDisabled) return;
    const today = this.todayBsInternal();
    if (!today) return;
    this.viewYear = today.year;
    this.viewMonth = today.month;
    this.recomputeCalendar();
    this.selectDay(today.day);
  }

  isSelected(day: number): boolean {
    return (
      !!this.selectedBs &&
      this.selectedBs.year === this.viewYear &&
      this.selectedBs.month === this.viewMonth &&
      this.selectedBs.day === day
    );
  }

  isToday(day: number): boolean {
    const today = this.todayBsInternal();
    return !!today && today.year === this.viewYear && today.month === this.viewMonth && today.day === day;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** 'D MMMM YYYY' with the app's month names ("Ashwin", as everywhere else in the app). */
  private formatBsDisplay(bs: BsDate): string {
    return `${bs.day} ${BS_MONTHS[bs.month]} ${bs.year}`;
  }

  /** The BS date (0-indexed month) for an AD date, or null when the BS calendar doesn't cover it. */
  private adToBs(date: Date | string): BsDate | null {
    const bs = this.bsCalendar.toBs(date);
    return bs ? { year: bs.year, month: bs.month - 1, day: bs.day } : null;
  }

  private todayBsInternal(): BsDate | null {
    const bs = this.bsCalendar.todayBs();
    return bs ? { year: bs.year, month: bs.month - 1, day: bs.day } : null;
  }

  private recomputeCalendar(): void {
    const days = this.bsCalendar.daysInMonth(this.viewYear, this.viewMonth + 1) ?? 30;
    const firstDay = this.bsCalendar.toAd({ year: this.viewYear, month: this.viewMonth + 1, day: 1 });
    this.emptySlots = Array(firstDay ? firstDay.getDay() : 0).fill(null);
    this.dayNumbers = Array.from({ length: days }, (_, i) => i + 1);
  }

  private syncFromAd(adDate: Date | string): void {
    const jsDate = adDate instanceof Date ? adDate : new Date(adDate as string);
    if (isNaN(jsDate.getTime())) return;
    this.selectedAd = new Date(jsDate.getFullYear(), jsDate.getMonth(), jsDate.getDate());
    this.adInputControl.setValue(this.selectedAd, { emitEvent: false });
    this.selectedBs = this.adToBs(this.selectedAd);
    if (this.selectedBs) {
      this.viewYear = this.selectedBs.year;
      this.viewMonth = this.selectedBs.month;
      this.bsInputControl.setValue(this.formatBsDisplay(this.selectedBs), { emitEvent: false });
      this.recomputeCalendar();
    } else {
      // Outside the BS calendar: shown in AD only, never guessed.
      this.bsInputControl.setValue('', { emitEvent: false });
    }
    this.bsDateChange.emit(formatBs(this.selectedBs));
  }

  private clearState(emitChange: boolean): void {
    this.selectedBs = null;
    this.selectedAd = null;
    this.bsInputControl.setValue('', { emitEvent: false });
    this.adInputControl.setValue(null, { emitEvent: false });
    if (emitChange) this.onChange(null);
    this.bsDateChange.emit(null);
  }
}
