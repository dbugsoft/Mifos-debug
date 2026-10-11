/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { merge } from 'rxjs';

/** Custom Services */
import { SettingsService } from './settings.service';
import { AlertService } from 'app/core/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle
} from '@angular/material/expansion';
import { FileUploadComponent } from '../shared/file-upload/file-upload.component';
import { ThemePickerComponent } from '../shared/theme-picker/theme-picker.component';
import { LanguageSelectorComponent } from '../shared/language-selector/language-selector.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { HasPermissionDirective } from '../directives/has-permission/has-permission.directive';
import { CalendarName, CalendarPreferenceService } from '../core/bs-calendar/calendar-preference.service';

/**
 * Settings component.
 */
@Component({
  selector: 'mifosx-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    FileUploadComponent,
    ThemePickerComponent,
    LanguageSelectorComponent,
    HasPermissionDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private alertService = inject(AlertService);
  private translateService = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private calendarPreference = inject(CalendarPreferenceService);

  /** The calendar setting (fineract-dbug ADR 0020): yours ('' follows the cooperative's default) and the default. */
  readonly calendarSetting = this.calendarPreference.setting;
  readonly myCalendar = new FormControl('');
  readonly cooperativeCalendar = new FormControl('BS');

  hasChanges = false;

  /** Date formats. */
  dateFormats: string[] = [
    'dd MMMM yyyy',
    'dd/MM/yyyy',
    'dd/MMMM/yyyy',
    'dd-MM-yyyy',
    'dd-MMMM-yyyy',
    'dd-MM-yy',
    'MM/dd/yyyy',
    'MMMM-dd-yyyy',
    'MMMM dd yyyy',
    'MMMM/dd/yyyy',
    'MM-dd-yy',
    'yyyy-MM-dd'
  ];
  datetimeFormats: string[] = [
    // All date formats with HH:mm:ss (seconds)
    'dd MMMM yyyy HH:mm:ss',
    'dd/MMMM/yyyy HH:mm:ss',
    'dd-MMMM-yyyy HH:mm:ss',
    'dd-MM-yy HH:mm:ss',
    'MMMM-dd-yyyy HH:mm:ss',
    'MMMM dd yyyy HH:mm:ss',
    'MMMM/dd/yyyy HH:mm:ss',
    'MM-dd-yy HH:mm:ss',
    'yyyy-MM-dd HH:mm:ss',
    // All date formats with HH:mm (no seconds)
    'dd MMMM yyyy HH:mm',
    'dd/MMMM/yyyy HH:mm',
    'dd-MMMM-yyyy HH:mm',
    'dd-MM-yy HH:mm',
    'MMMM-dd-yyyy HH:mm',
    'MMMM dd yyyy HH:mm',
    'MMMM/dd/yyyy HH:mm',
    'MM-dd-yy HH:mm',
    'yyyy-MM-dd HH:mm'
  ];
  /** Decimals. */
  decimals: string[] = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8'
  ];
  /** Placeholder for fonts. */
  fonts: any;

  /** Date Format Setting */
  dateFormat = new FormControl('');
  /** Datetime Format Setting */
  datetimeFormat = new FormControl('');
  /** Decimals to Display Setting */
  decimalsToDisplay = new FormControl('');

  private initialValues: {
    dateFormat: string;
    datetimeFormat: string;
    decimals: string;
  };

  ngOnInit() {
    this.showCalendarSetting();
    this.initialValues = {
      dateFormat: this.settingsService.dateFormat,
      datetimeFormat: this.settingsService.datetimeFormat,
      decimals: this.settingsService.decimals
    };
    this.dateFormat.patchValue(this.initialValues.dateFormat, { emitEvent: false });
    this.datetimeFormat.patchValue(this.initialValues.datetimeFormat, { emitEvent: false });
    this.decimalsToDisplay.patchValue(this.initialValues.decimals, { emitEvent: false });
    this.trackChanges();
  }

  /** Your own calendar; '' goes back to the cooperative's default. */
  saveMyCalendar(calendar: CalendarName | ''): void {
    this.calendarPreference.setMine(calendar || null).subscribe({
      next: () => this.calendarSaved(),
      error: () => this.showCalendarSetting()
    });
  }

  saveCooperativeCalendar(calendar: CalendarName): void {
    this.calendarPreference.setCooperativeDefault(calendar).subscribe({
      next: () => this.calendarSaved(),
      error: () => this.showCalendarSetting()
    });
  }

  private calendarSaved(): void {
    this.showCalendarSetting();
    this.alertService.alert({
      type: this.translateService.instant('bsCalendar.Calendar'),
      message: this.translateService.instant('bsCalendar.Saved')
    });
  }

  private showCalendarSetting(): void {
    this.myCalendar.setValue(this.calendarSetting().mine ?? '', { emitEvent: false });
    this.cooperativeCalendar.setValue(this.calendarSetting().cooperativeDefault, { emitEvent: false });
  }

  trackChanges(): void {
    merge(this.dateFormat.valueChanges, this.datetimeFormat.valueChanges, this.decimalsToDisplay.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.hasChanges = this.hasFormChanged();
      });
  }

  private hasFormChanged(): boolean {
    return (
      (this.dateFormat.value ?? '') !== this.initialValues.dateFormat ||
      (this.datetimeFormat.value ?? '') !== this.initialValues.datetimeFormat ||
      (this.decimalsToDisplay.value ?? '') !== this.initialValues.decimals
    );
  }

  submit(): void {
    this.settingsService.setDateFormat(this.dateFormat.value ?? this.initialValues.dateFormat);
    this.settingsService.setDatetimeFormat(this.datetimeFormat.value ?? this.initialValues.datetimeFormat);
    this.settingsService.setDecimalToDisplay(this.decimalsToDisplay.value ?? this.initialValues.decimals);
    this.initialValues = {
      dateFormat: this.dateFormat.value ?? '',
      datetimeFormat: this.datetimeFormat.value ?? '',
      decimals: this.decimalsToDisplay.value ?? ''
    };
    this.hasChanges = false;
    this.alertService.alert({
      type: 'Settings Update',
      message: this.translateService.instant('labels.text.Settings saved successfully')
    });
  }
}
