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

import { Component, OnInit, inject } from '@angular/core';
import { CoopAdminNavbarComponent } from '../coop-admin-navbar/coop-admin-navbar.component';
import { CommonModule } from '@angular/common';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ChangeDetectorRef } from '@angular/core';

import { forkJoin } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatInputModule } from '@angular/material/input';

import { CoopLocation, CoopProfileService } from 'app/coop/services/coop-profile.service';

import { CoopAdminRegistration, CoopAdminService } from '../../services/coop-admin.service';

@Component({
  selector: 'mifosx-coop-admin-detail',

  standalone: true,

  imports: [
    CoopAdminNavbarComponent,
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],

  templateUrl: './coop-admin-detail.component.html',

  styleUrl: './coop-admin-detail.component.scss'
})
export class CoopAdminDetailComponent implements OnInit {
  // =====================================================
  // SERVICES
  // =====================================================

  private coopProfileService = inject(CoopProfileService);

  private fb = inject(FormBuilder);

  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private coopAdminService = inject(CoopAdminService);

  private cdr = inject(ChangeDetectorRef);

  // =====================================================
  // COOPERATIVE DATA
  // =====================================================

  cooperative: CoopAdminRegistration | null = null;

  locations: CoopLocation[] = [];

  provinceName = '--';

  districtName = '--';

  localLevelName = '--';

  // =====================================================
  // LOADING / ERROR
  // =====================================================

  loading = true;

  loadError = '';

  successMessage = '';

  errorMessage = '';

  // =====================================================
  // VERIFY FORM
  // =====================================================

  verifyForm = this.fb.nonNullable.group({
    remarks: [
      '',
      Validators.required
    ]
  });

  isVerifying = false;

  // =====================================================
  // REJECT FORM
  // =====================================================

  showRejectForm = false;

  rejectForm = this.fb.nonNullable.group({
    reason: [
      '',
      Validators.required
    ]
  });

  isRejecting = false;

  // =====================================================
  // ACTIVATE FORM
  // =====================================================

  activateForm = this.fb.nonNullable.group({
    remarks: ['']
  });

  isActivating = false;

  showActivateConfirm = false;

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');

      const id = idParam ? Number(idParam) : NaN;

      // -----------------------------------------------
      // INVALID ID
      // -----------------------------------------------

      if (!idParam || Number.isNaN(id)) {
        this.cooperative = null;

        this.loading = false;

        this.loadError = 'Invalid cooperative id.';

        return;
      }

      // -----------------------------------------------
      // LOAD
      // -----------------------------------------------

      this.loadCooperative(id);
    });
  }

  // =====================================================
  // LOAD COOPERATIVE + LOCATIONS
  // =====================================================

  private loadCooperative(id: number): void {
    this.loading = true;

    this.loadError = '';

    this.errorMessage = '';

    this.successMessage = '';

    this.cooperative = null;

    /*
     * Reset location names while loading.
     */

    this.provinceName = '--';

    this.districtName = '--';

    this.localLevelName = '--';

    /*
     * IMPORTANT:
     *
     * Cooperative API and Locations API are now
     * requested in parallel.
     *
     * Before:
     *
     * cooperative API
     *       ↓
     * locations API
     *
     * Now:
     *
     * cooperative API ─────┐
     *                       ├──> continue
     * locations API ───────┘
     *
     * This prevents unnecessary sequential waiting.
     */

    forkJoin({
      cooperative: this.coopAdminService.getCooperativeById(id),

      locations: this.coopProfileService.getLocations()
    }).subscribe({
      // =================================================
      // SUCCESS
      // =================================================

      next: ({ cooperative, locations }) => {
        console.log('COOPERATIVE DETAILS:', cooperative);

        console.log('LOCATIONS:', locations);

        // -----------------------------------------------
        // SET DATA
        // -----------------------------------------------

        this.cooperative = cooperative;

        this.locations = locations;

        // -----------------------------------------------
        // FIND LOCATION
        // -----------------------------------------------

        this.setLocationNames();

        // -----------------------------------------------
        // FINISHED
        // -----------------------------------------------

        this.loading = false;

        this.cdr.detectChanges();
      },

      // =================================================
      // ERROR
      // =================================================

      error: (error) => {
        console.error('COOPERATIVE / LOCATION API ERROR:', error);

        console.error('STATUS:', error?.status);

        console.error('ERROR BODY:', error?.error);

        this.cooperative = null;

        this.loading = false;

        this.loadError = error?.error?.error || error?.error?.message || 'Unable to load cooperative details.';

        this.cdr.detectChanges();
      }
    });
  }

  // =====================================================
  // SET LOCATION NAMES
  // =====================================================

  private setLocationNames(): void {
    if (!this.cooperative) {
      return;
    }

    if (!this.locations.length) {
      console.warn('Locations list is empty.');

      this.provinceName = '--';

      this.districtName = '--';

      this.localLevelName = '--';

      return;
    }

    const localLevelId = Number(this.cooperative.localLevelId);

    console.log('Looking for local level:', localLevelId);

    /*
     * Match localLevelId with location.id.
     */

    const location = this.locations.find((loc) => Number(loc.id) === localLevelId);

    console.log('MATCHED LOCATION:', location);

    // ===================================================
    // MATCH FOUND
    // ===================================================

    if (location) {
      this.provinceName = location.provinceNameEn || '--';

      this.districtName = location.districtNameEn || '--';

      this.localLevelName = location.localLevelNameEn || '--';
    }

    // ===================================================
    // MATCH NOT FOUND
    // ===================================================
    else {
      console.warn('Location not found for localLevelId:', localLevelId);

      this.provinceName = '--';

      this.districtName = '--';

      this.localLevelName = '--';
    }

    this.cdr.detectChanges();
  }

  // =====================================================
  // VERIFY COOPERATIVE
  // PENDING -> PROVISIONED
  // =====================================================

  submitVerify(): void {
    if (!this.cooperative) {
      return;
    }

    this.successMessage = '';

    this.errorMessage = '';

    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();

      return;
    }

    const remarks = this.verifyForm.getRawValue().remarks;

    this.isVerifying = true;

    this.coopAdminService.verifyCooperative(this.cooperative.id, remarks).subscribe({
      next: (updated) => {
        console.log('VERIFY SUCCESS:', updated);

        this.isVerifying = false;

        this.cooperative = updated;

        this.successMessage = 'Cooperative verified and tenant provisioned successfully.';

        this.verifyForm.reset();

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('VERIFY ERROR:', error);

        this.isVerifying = false;

        this.errorMessage =
          error?.error?.error || error?.error?.message || 'Unable to verify this cooperative. Please try again.';

        this.cdr.detectChanges();
      }
    });
  }

  // =====================================================
  // TOGGLE REJECT FORM
  // =====================================================

  toggleRejectForm(): void {
    this.showRejectForm = !this.showRejectForm;

    this.errorMessage = '';

    this.successMessage = '';
  }

  // =====================================================
  // REJECT COOPERATIVE
  // =====================================================

  submitReject(): void {
    if (!this.cooperative) {
      return;
    }

    this.successMessage = '';

    this.errorMessage = '';

    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();

      return;
    }

    const reason = this.rejectForm.getRawValue().reason;

    this.isRejecting = true;

    this.coopAdminService.rejectCooperative(this.cooperative.id, reason).subscribe({
      next: (updated) => {
        console.log('REJECT SUCCESS:', updated);

        this.isRejecting = false;

        this.cooperative = updated;

        this.successMessage = 'Cooperative has been rejected.';

        this.showRejectForm = false;

        this.rejectForm.reset();

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('REJECT ERROR:', error);

        this.isRejecting = false;

        this.errorMessage =
          error?.error?.error || error?.error?.message || 'Unable to reject this cooperative. Please try again.';

        this.cdr.detectChanges();
      }
    });
  }

  // =====================================================
  // TOGGLE ACTIVATE CONFIRMATION
  // =====================================================

  toggleActivateConfirm(): void {
    this.showActivateConfirm = !this.showActivateConfirm;

    this.errorMessage = '';

    this.successMessage = '';
  }

  // =====================================================
  // ACTIVATE TENANT
  // PROVISIONED -> ACTIVE
  // =====================================================

  confirmActivate(): void {
    if (!this.cooperative) {
      return;
    }

    if (this.cooperative.status !== 'PROVISIONED') {
      this.errorMessage = 'Only a provisioned tenant can be activated.';

      return;
    }

    this.successMessage = '';

    this.errorMessage = '';

    this.isActivating = true;

    console.log('Activating cooperative ID:', this.cooperative.id);

    this.coopAdminService.activateCooperative(this.cooperative.id).subscribe({
      next: (updated) => {
        console.log('ACTIVATE SUCCESS:', updated);

        this.isActivating = false;

        this.cooperative = updated;

        this.successMessage = 'Tenant has been activated successfully.';

        this.showActivateConfirm = false;

        this.activateForm.reset();

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('ACTIVATE ERROR:', error);

        this.isActivating = false;

        if (error?.status === 403) {
          this.errorMessage =
            'You are not authorized to activate this tenant. Please check the backend authorization/permission for the activate endpoint.';
        } else {
          this.errorMessage =
            error?.error?.error || error?.error?.message || 'Unable to activate this tenant. Please try again.';
        }

        this.cdr.detectChanges();
      }
    });
  }
}
