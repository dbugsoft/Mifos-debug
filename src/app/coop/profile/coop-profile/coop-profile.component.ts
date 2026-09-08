/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, effect, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { CommonModule } from '@angular/common';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatInputModule } from '@angular/material/input';

import { MatButtonModule } from '@angular/material/button';

import { MatSelectModule } from '@angular/material/select';

import { firstValueFrom } from 'rxjs';

import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { CoopAuthService } from '../../services/coop-auth.service';

import { CoopTokenService } from '../../services/coop-token.service';

import { CoopLocation, CoopProfile, CoopProfileService } from '../../services/coop-profile.service';
import { CoopNavbarComponent } from '../../coop-navbar/coop-navbar.component';
import { locationsQueryOptions, profileQueryOptions } from '../../queries/coop-profile.queries';
import { coopQueryKeys } from '../../queries/coop-query-keys';
import { extractCoopErrorMessage } from '../../queries/coop-error.util';

@Component({
  selector: 'mifosx-coop-profile',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    RouterLink,
    RouterLinkActive,
    CoopNavbarComponent
  ],

  templateUrl: './coop-profile.component.html',

  styleUrl: './coop-profile.component.scss'
})
export class CoopProfileComponent {
  // =====================================================
  // SERVICES
  // =====================================================

  private fb = inject(FormBuilder);

  private coopProfileService = inject(CoopProfileService);

  private router = inject(Router);

  private coopAuthService = inject(CoopAuthService);

  private coopTokenService = inject(CoopTokenService);

  private queryClient = inject(QueryClient);

  // =====================================================
  // SERVER STATE (TanStack Query)
  // =====================================================

  private profileQuery = injectQuery(() => profileQueryOptions(this.coopProfileService));

  private locationsQuery = injectQuery(() => locationsQueryOptions(this.coopProfileService));

  private createProfileMutation = injectMutation(() => ({
    mutationFn: (profile: CoopProfile) => firstValueFrom(this.coopProfileService.createProfile(profile)),

    onSuccess: (created) => {
      this.queryClient.setQueryData(coopQueryKeys.profile(), created);
    }
  }));

  private updateProfileMutation = injectMutation(() => ({
    mutationFn: (profile: Partial<CoopProfile>) => firstValueFrom(this.coopProfileService.updateProfile(profile)),

    onSuccess: (updated) => {
      /*
       * PATCH may return only the changed fields rather than
       * the full profile, so merge onto the previously cached
       * value instead of replacing it outright.
       */
      this.queryClient.setQueryData(coopQueryKeys.profile(), (previous?: CoopProfile) => ({
        ...(previous ?? updated),
        ...updated
      }));
    }
  }));

  // =====================================================
  // UI STATE
  // =====================================================

  isSubmitting = false;

  successMessage = '';

  errorMessage = '';
  selectedLogoFile: File | null = null;

  selectedLogoName = '';

  logoPreview = '';

  // =====================================================
  // PROFILE MODE
  // =====================================================

  /**
   * true = existing profile → PATCH
   *
   * false = new profile → POST
   */
  isEditMode = false;
  isActive = false;
  profileStatus = '';

  // =====================================================
  // LOCATION DATA
  // =====================================================

  locations: CoopLocation[] = [];

  provinces: CoopLocation[] = [];

  districts: CoopLocation[] = [];

  localLevels: CoopLocation[] = [];

  wards: number[] = [];

  // =====================================================
  // LOCATION LOADING STATE
  // =====================================================

  get locationsLoading(): boolean {
    return this.locationsQuery.isPending();
  }

  /**
   * True only while the profile (and its address dropdown data) are
   * being fetched for the very first time - drives the shimmer
   * skeleton. Becomes false as soon as either query settles
   * (success or error), matching how the existing effects already
   * treat isPending() as "no usable data yet".
   */
  get initialLoading(): boolean {
    return this.profileQuery.isPending() || this.locationsQuery.isPending();
  }

  // =====================================================
  // PROFILE FORM
  // =====================================================

  profileForm = this.fb.nonNullable.group({
    coopRegdNo: [
      '',
      Validators.required
    ],

    nameNp: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[\u0900-\u097F\s।,()-]+$/)
      ]
    ],

    nameEn: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[A-Za-z]+(?:[A-Za-z&.]+| [A-Za-z&.]+)*$/)
      ]
    ],

    dateOfRegistered: [
      '',
      Validators.required
    ],

    panNo: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d{9}$/)
      ]
    ],

    provinceId: [
      null as number | null,
      Validators.required
    ],

    districtId: [
      null as number | null,
      Validators.required
    ],

    localLevelId: [
      null as number | null,
      Validators.required
    ],

    wardNo: [
      null as number | null
    ],

    tole: [
      '',
      [
        Validators.pattern(/^[A-Za-z]+(?: [A-Za-z]+)*$/)
      ]
    ],

    houseNo: [
      ''
    ],

    mobilePhone: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(97|98)\d{8}$/)
      ]
    ],

    officePhone: [
      ''
    ],

    logoUrl: [
      ''
    ],

    about: [
      ''
    ],

    remarks: [
      ''
    ]
  });

  // =====================================================
  // INIT
  // =====================================================

  constructor() {
    /*
     * Profile and locations are queried independently by
     * TanStack Query (profile does NOT wait for locations).
     * Each effect re-runs whenever ITS OWN query settles, and
     * reads whatever the other side currently holds - so
     * whichever of the two arrives second is the one that
     * builds the location dropdowns, exactly as before.
     */

    effect(() => {
      const profile = this.profileQuery.data();

      if (profile) {
        this.profileForm.patchValue(profile);

        // patchValue() should not make the form dirty.
        this.profileForm.markAsPristine();

        this.isEditMode = true;

        this.profileStatus = profile.status ?? '';

        this.isActive = profile.status === 'ACTIVE' || profile.status === 'PROVISIONED';

        if (this.locations.length > 0) {
          this.buildLocationDropdowns(profile);
        }

        return;
      }

      if (this.profileQuery.isError()) {
        // New user may not have a profile yet.
        if (this.isNoProfileError(this.profileQuery.error())) {
          this.isEditMode = false;

          return;
        }

        this.errorMessage = extractCoopErrorMessage(this.profileQuery.error(), 'Unable to load cooperative profile.');
      }
    });

    effect(() => {
      const locations = this.locationsQuery.data();

      if (!locations) {
        if (this.locationsQuery.isError()) {
          this.errorMessage = 'Unable to load address information.';
        }

        return;
      }

      this.locations = locations;

      this.provinces = this.getUniqueProvinces();

      /*
       * Profile may already have been loaded. If provinceId
       * exists, build the dependent dropdowns now.
       */

      const profile = this.profileForm.getRawValue();

      if (profile.provinceId !== null || profile.districtId !== null || profile.localLevelId !== null) {
        this.buildLocationDropdowns(profile);
      }
    });
  }

  private isNoProfileError(error: unknown): boolean {
    const httpError = error as { error?: { error?: string } } | null | undefined;

    return httpError?.error?.error === 'No profile submitted yet';
  }

  // =====================================================
  // BUILD LOCATION DROPDOWNS
  // =====================================================

  private buildLocationDropdowns(profile: Partial<CoopProfile>): void {
    console.log('BUILDING LOCATION DROPDOWNS:', profile);

    // -----------------------------------------------
    // PROVINCE
    // -----------------------------------------------

    const provinceId = profile.provinceId;

    if (provinceId !== null && provinceId !== undefined) {
      this.setDistricts(Number(provinceId));
    }

    // -----------------------------------------------
    // DISTRICT
    // -----------------------------------------------

    const districtId = profile.districtId;

    if (districtId !== null && districtId !== undefined) {
      this.setLocalLevels(Number(districtId));
    }

    // -----------------------------------------------
    // LOCAL LEVEL
    // -----------------------------------------------

    const localLevelId = profile.localLevelId;

    if (localLevelId !== null && localLevelId !== undefined) {
      this.setWards(Number(localLevelId));
    }
  }

  // =====================================================
  // UNIQUE PROVINCES
  // =====================================================

  private getUniqueProvinces(): CoopLocation[] {
    const unique = new Map<string, CoopLocation>();

    for (const location of this.locations) {
      if (!unique.has(location.provinceCode)) {
        unique.set(location.provinceCode, location);
      }
    }

    return Array.from(unique.values());
  }

  // =====================================================
  // PROVINCE CHANGE
  // =====================================================

  onProvinceChange(provinceId: number | null): void {
    // -----------------------------------------------
    // RESET DEPENDENT VALUES
    // -----------------------------------------------

    this.profileForm.patchValue({
      districtId: null,

      localLevelId: null,

      wardNo: null
    });

    // -----------------------------------------------
    // CLEAR DROPDOWNS
    // -----------------------------------------------

    this.districts = [];

    this.localLevels = [];

    this.wards = [];

    // -----------------------------------------------
    // NO PROVINCE
    // -----------------------------------------------

    if (provinceId === null) {
      return;
    }

    // -----------------------------------------------
    // LOAD DISTRICTS
    // -----------------------------------------------

    this.setDistricts(provinceId);
  }

  // =====================================================
  // SET DISTRICTS
  // =====================================================

  private setDistricts(provinceId: number): void {
    console.log('SETTING DISTRICTS FOR PROVINCE:', provinceId);

    // -----------------------------------------------
    // FIND PROVINCE
    // -----------------------------------------------

    const selectedProvince = this.provinces.find((province) => Number(province.id) === Number(provinceId));

    if (!selectedProvince) {
      console.warn('Province not found:', provinceId);

      return;
    }

    // -----------------------------------------------
    // FILTER DISTRICTS
    // -----------------------------------------------

    this.districts = this.locations

      .filter((location) => location.provinceCode === selectedProvince.provinceCode)

      .filter(
        (location, index, self) => index === self.findIndex((item) => item.districtCode === location.districtCode)
      );

    console.log('DISTRICTS:', this.districts);
  }

  // =====================================================
  // DISTRICT CHANGE
  // =====================================================

  onDistrictChange(districtId: number | null): void {
    // -----------------------------------------------
    // RESET DEPENDENT VALUES
    // -----------------------------------------------

    this.profileForm.patchValue({
      localLevelId: null,

      wardNo: null
    });

    // -----------------------------------------------
    // CLEAR DROPDOWNS
    // -----------------------------------------------

    this.localLevels = [];

    this.wards = [];

    if (districtId === null) {
      return;
    }

    // -----------------------------------------------
    // LOAD LOCAL LEVELS
    // -----------------------------------------------

    this.setLocalLevels(districtId);
  }

  // =====================================================
  // SET LOCAL LEVELS
  // =====================================================

  private setLocalLevels(districtId: number): void {
    console.log('SETTING LOCAL LEVELS FOR DISTRICT:', districtId);

    // -----------------------------------------------
    // FIND DISTRICT
    // -----------------------------------------------

    const selectedDistrict = this.districts.find((district) => Number(district.id) === Number(districtId));

    if (!selectedDistrict) {
      console.warn('District not found:', districtId);

      return;
    }

    // -----------------------------------------------
    // FILTER LOCAL LEVELS
    // -----------------------------------------------

    this.localLevels = this.locations

      .filter(
        (location) =>
          location.provinceCode === selectedDistrict.provinceCode &&
          location.districtCode === selectedDistrict.districtCode
      )

      .filter(
        (location, index, self) => index === self.findIndex((item) => item.localLevelCode === location.localLevelCode)
      );

    console.log('LOCAL LEVELS:', this.localLevels);
  }

  // =====================================================
  // LOCAL LEVEL CHANGE
  // =====================================================

  onLocalLevelChange(localLevelId: number | null): void {
    // -----------------------------------------------
    // RESET WARD
    // -----------------------------------------------

    this.profileForm.patchValue({
      wardNo: null
    });

    this.wards = [];

    if (localLevelId === null) {
      return;
    }

    // -----------------------------------------------
    // LOAD WARDS
    // -----------------------------------------------

    this.setWards(localLevelId);
  }
  //English Name Validation
  onEnglishKeydown(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab'
    ];

    // Editing/navigation keys
    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Ctrl/Cmd shortcuts: copy, paste, cut, select all
    if (event.ctrlKey || event.metaKey) {
      return;
    }

    // English letters
    if (/^[A-Za-z]$/.test(event.key)) {
      return;
    }

    // Space
    if (event.key === ' ') {
      return;
    }

    // Allowed special characters
    if (event.key === '&' || event.key === '.') {
      return;
    }

    // Everything else blocked
    event.preventDefault();
  }
  onEnglishInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    const englishOnly = input.value.replace(/[^A-Za-z &.]/g, '');

    if (input.value !== englishOnly) {
      input.value = englishOnly;

      this.profileForm.get('nameEn')?.setValue(englishOnly, { emitEvent: false });
    }
  }

  onNepaliKeydown(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab'
    ];

    // Backspace, delete, arrow keys etc. allow
    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Ctrl+C, Ctrl+V, Ctrl+A, Cmd+C, Cmd+V etc.
    if (event.ctrlKey || event.metaKey) {
      return;
    }

    // Space allow
    if (event.key === ' ') {
      return;
    }

    // Nepali Unicode characters allow
    if (/[\u0900-\u097F]/.test(event.key)) {
      return;
    }

    // Everything else block
    event.preventDefault();
  }
  onNepaliInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    // Keep only Nepali Unicode characters, spaces and allowed punctuation
    const nepaliOnly = input.value.replace(/[^\u0900-\u097F\s।,()-]/g, '');

    if (input.value !== nepaliOnly) {
      input.value = nepaliOnly;

      this.profileForm.get('nameNp')?.setValue(nepaliOnly, { emitEvent: false });
    }
  }
  //date format
  onDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    let value = input.value.replace(/\D/g, '');

    // Maximum 8 digits: YYYYMMDD
    value = value.substring(0, 8);

    let formatted = value;

    if (value.length >= 4) {
      formatted = value.substring(0, 4) + '-';

      if (value.length > 4) {
        formatted += value.substring(4, 6);
      }

      if (value.length >= 6) {
        formatted += '-';

        if (value.length > 6) {
          formatted += value.substring(6, 8);
        }
      }
    }

    this.profileForm.get('dateOfRegistered')?.setValue(formatted, { emitEvent: false });
  }

  onDateKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      const cursorPosition = input.selectionStart ?? 0;

      // If cursor is immediately after "-", delete the "-" and
      // allow the previous digit to be deleted naturally.
      if (cursorPosition > 0 && input.value.charAt(cursorPosition - 1) === '-') {
        event.preventDefault();

        const newValue = input.value.substring(0, cursorPosition - 1) + input.value.substring(cursorPosition);

        this.profileForm.get('dateOfRegistered')?.setValue(newValue, { emitEvent: false });

        setTimeout(() => {
          input.setSelectionRange(cursorPosition - 1, cursorPosition - 1);
        });
      }
    }
  }
  //Pan key
  onPanKeydown(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab'
    ];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Copy, paste, cut, select all
    if (event.ctrlKey || event.metaKey) {
      return;
    }

    // Only digits 0-9
    if (/^\d$/.test(event.key)) {
      return;
    }

    // Block everything else
    event.preventDefault();
  }

  onPanInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 9);

    if (input.value !== digitsOnly) {
      input.value = digitsOnly;

      this.profileForm.get('panNo')?.setValue(digitsOnly, { emitEvent: false });
    }
  }

  //Tole validation
  onToleKeydown(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab'
    ];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Copy, paste, cut, select all
    if (event.ctrlKey || event.metaKey) {
      return;
    }

    // English letters only
    if (/^[A-Za-z]$/.test(event.key)) {
      return;
    }

    // Space
    if (event.key === ' ') {
      return;
    }

    event.preventDefault();
  }
  onToleInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    const lettersOnly = input.value.replace(/[^A-Za-z ]/g, '');

    if (input.value !== lettersOnly) {
      input.value = lettersOnly;

      this.profileForm.get('tole')?.setValue(lettersOnly, { emitEvent: false });
    }
  }
  //Mobile number validation
  onMobileKeydown(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab'
    ];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Copy, paste, cut, select all
    if (event.ctrlKey || event.metaKey) {
      return;
    }

    // Numbers only
    if (/^\d$/.test(event.key)) {
      return;
    }

    event.preventDefault();
  }
  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    const numbersOnly = input.value.replace(/\D/g, '').slice(0, 10);

    if (input.value !== numbersOnly) {
      input.value = numbersOnly;

      this.profileForm.get('mobilePhone')?.setValue(numbersOnly, { emitEvent: false });
    }
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.selectedLogoFile = null;
      this.selectedLogoName = '';
      this.logoPreview = '';
      return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please select a valid image file.';
      input.value = '';
      return;
    }

    this.errorMessage = '';

    this.selectedLogoFile = file;
    this.selectedLogoName = file.name;

    const reader = new FileReader();

    reader.onload = () => {
      this.logoPreview = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  clearLogoSelection(): void {
    this.selectedLogoFile = null;
    this.selectedLogoName = '';
    this.logoPreview = '';
  }
  // =====================================================
  // SET WARDS
  // =====================================================

  private setWards(localLevelId: number): void {
    console.log('SETTING WARDS FOR LOCAL LEVEL:', localLevelId);

    // -----------------------------------------------
    // FIND LOCAL LEVEL
    // -----------------------------------------------

    const selectedLocalLevel = this.localLevels.find((localLevel) => Number(localLevel.id) === Number(localLevelId));

    if (!selectedLocalLevel) {
      console.warn('Local level not found:', localLevelId);

      return;
    }

    // -----------------------------------------------
    // CREATE WARDS
    // -----------------------------------------------

    this.wards = Array.from(
      {
        length: selectedLocalLevel.totalWard
      },

      (_, index) => index + 1
    );

    console.log('WARDS:', this.wards);
  }

  // =====================================================
  // BUILD PATCH PAYLOAD
  // =====================================================
  private getChangedFields(): Partial<CoopProfile> {
    const changedFields: Partial<CoopProfile> = {};

    const rawValue = this.profileForm.getRawValue();

    Object.keys(this.profileForm.controls).forEach((key) => {
      const controlKey = key as keyof CoopProfile;

      const control = this.profileForm.get(controlKey);

      if (control?.dirty) {
        (changedFields as any)[controlKey] = (rawValue as any)[controlKey];
      }
    });

    return changedFields;
  }

  // =====================================================
  // SUBMIT
  // =====================================================

  onSubmit(): void {
    if (this.isActive) {
      return;
    }

    this.successMessage = '';

    this.errorMessage = '';

    // -----------------------------------------------
    // VALIDATION
    // -----------------------------------------------

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();

      return;
    }

    this.isSubmitting = true;

    // =================================================
    // EDIT MODE
    // =================================================

    if (this.isEditMode) {
      const changedFields = this.getChangedFields();

      // ---------------------------------------------
      // NOTHING CHANGED
      // ---------------------------------------------

      if (Object.keys(changedFields).length === 0) {
        this.isSubmitting = false;

        this.successMessage = 'No changes to save.';

        return;
      }

      // ---------------------------------------------
      // PATCH
      // ---------------------------------------------

      this.updateProfileMutation.mutate(changedFields, {
        onSuccess: () => {
          this.isSubmitting = false;

          this.successMessage = 'Cooperative profile updated successfully.';

          this.profileForm.markAsPristine();
        },

        onError: (error) => {
          this.isSubmitting = false;

          this.errorMessage = extractCoopErrorMessage(error, 'Unable to update profile. Please try again.');
        }
      });

      return;
    }

    // =================================================
    // CREATE MODE
    // =================================================

    const profileData: CoopProfile = this.profileForm.getRawValue();

    this.createProfileMutation.mutate(profileData, {
      onSuccess: () => {
        this.isSubmitting = false;

        this.successMessage = 'Cooperative profile created successfully.';

        this.isEditMode = true;

        this.profileForm.markAsPristine();
      },

      onError: (error) => {
        this.isSubmitting = false;

        this.errorMessage = extractCoopErrorMessage(error, 'Unable to create profile. Please try again.');
      }
    });
  }
}
