/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

//coop profile.component.ts
/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject, OnInit } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { CommonModule } from '@angular/common';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatInputModule } from '@angular/material/input';

import { MatButtonModule } from '@angular/material/button';

import { MatSelectModule } from '@angular/material/select';

import { CoopAuthService } from '../../services/coop-auth.service';

import { CoopTokenService } from '../../services/coop-token.service';

import { CoopLocation, CoopProfile, CoopProfileService } from '../../services/coop-profile.service';
import { CoopNavbarComponent } from '../../coop-navbar/coop-navbar.component';

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
export class CoopProfileComponent implements OnInit {
  // =====================================================
  // SERVICES
  // =====================================================

  private fb = inject(FormBuilder);

  private coopProfileService = inject(CoopProfileService);

  private router = inject(Router);

  private coopAuthService = inject(CoopAuthService);

  private coopTokenService = inject(CoopTokenService);

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

  locationsLoading = true;

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
      Validators.required
    ],

    nameEn: [
      '',
      Validators.required
    ],

    dateOfRegistered: [
      '',
      Validators.required
    ],

    panNo: [
      '',
      Validators.required
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
      ''
    ],

    houseNo: [
      ''
    ],

    mobilePhone: [
      '',
      Validators.required
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

  ngOnInit(): void {
    console.log('COOP PROFILE PAGE INITIALIZED');

    /*
     * IMPORTANT:
     *
     * Profile and locations are loaded
     * independently.
     *
     * Profile does NOT wait for locations.
     */

    this.loadProfile();

    this.loadLocations();
  }

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  private loadProfile(): void {
    console.time('PROFILE REQUEST');

    this.coopProfileService.getProfile().subscribe({
      // =================================================
      // SUCCESS
      // =================================================

      next: (response) => {
        console.timeEnd('PROFILE REQUEST');

        console.log('PROFILE RESPONSE:', response);

        // -----------------------------------------------
        // PATCH PROFILE IMMEDIATELY
        // -----------------------------------------------

        console.time('PROFILE PATCH');

        this.profileForm.patchValue(response);

        console.timeEnd('PROFILE PATCH');

        // -----------------------------------------------
        // EXISTING PROFILE
        // -----------------------------------------------

        this.isEditMode = true;

        /*
         * IMPORTANT:
         *
         * patchValue() should not make
         * the form dirty.
         */

        this.profileForm.markAsPristine();

        /*
         * Locations may already be loaded
         * or may still be loading.
         *
         * If they are already available,
         * build the dropdowns now.
         *
         * If not, loadLocations() will build
         * them when it finishes.
         */
        this.profileStatus = response.status ?? '';

        this.isActive = response.status === 'ACTIVE' || response.status === 'PROVISIONED';

        if (this.isActive) {
        }
        if (this.locations.length > 0) {
          this.buildLocationDropdowns(response);
        }
      },

      // =================================================
      // ERROR
      // =================================================

      error: (error) => {
        console.error('PROFILE API ERROR:', error);

        /*
         * New user may not have a profile yet.
         */

        if (error?.error?.error === 'No profile submitted yet') {
          console.log('NO PROFILE FOUND - CREATE MODE');

          this.isEditMode = false;

          return;
        }

        this.errorMessage =
          error?.error?.message ||
          error?.error?.error ||
          error?.error?.defaultUserMessage ||
          'Unable to load cooperative profile.';
      }
    });
  }

  // =====================================================
  // LOAD LOCATIONS
  // =====================================================

  private loadLocations(): void {
    console.time('LOCATIONS REQUEST');

    this.locationsLoading = true;

    this.coopProfileService.getLocations().subscribe({
      // =================================================
      // SUCCESS
      // =================================================

      next: (locations) => {
        console.timeEnd('LOCATIONS REQUEST');

        console.log('LOCATIONS LOADED:', locations.length);

        // -----------------------------------------------
        // STORE LOCATIONS
        // -----------------------------------------------

        this.locations = locations;

        // -----------------------------------------------
        // CREATE PROVINCES
        // -----------------------------------------------

        this.provinces = this.getUniqueProvinces();

        // -----------------------------------------------
        // MARK LOCATION LOADING COMPLETE
        // -----------------------------------------------

        this.locationsLoading = false;

        /*
         * Profile may already have been loaded.
         *
         * If provinceId exists,
         * build dependent dropdowns.
         */

        const profile = this.profileForm.getRawValue();

        if (profile.provinceId !== null || profile.districtId !== null || profile.localLevelId !== null) {
          this.buildLocationDropdowns(profile);
        }
      },

      // =================================================
      // ERROR
      // =================================================

      error: (error) => {
        console.error('LOCATIONS API ERROR:', error);

        this.locationsLoading = false;

        this.errorMessage = 'Unable to load address information.';
      }
    });
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
  // LOGOUT
  // =====================================================

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

      this.coopProfileService.updateProfile(changedFields).subscribe({
        next: () => {
          this.isSubmitting = false;

          this.successMessage = 'Cooperative profile updated successfully.';

          this.profileForm.markAsPristine();
        },

        error: (error) => {
          this.isSubmitting = false;

          this.errorMessage =
            error?.error?.message ||
            error?.error?.error ||
            error?.error?.defaultUserMessage ||
            'Unable to update profile. Please try again.';
        }
      });

      return;
    }

    // =================================================
    // CREATE MODE
    // =================================================

    const profileData: CoopProfile = this.profileForm.getRawValue();

    this.coopProfileService.createProfile(profileData).subscribe({
      next: () => {
        this.isSubmitting = false;

        this.successMessage = 'Cooperative profile created successfully.';

        this.isEditMode = true;

        this.profileForm.markAsPristine();
      },

      error: (error) => {
        this.isSubmitting = false;

        this.errorMessage =
          error?.error?.message ||
          error?.error?.error ||
          error?.error?.defaultUserMessage ||
          'Unable to create profile. Please try again.';
      }
    });
  }
}
