/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, computed, inject } from '@angular/core';
import { CoopAdminNavbarComponent } from '../coop-admin-navbar/coop-admin-navbar.component';
import { CommonModule } from '@angular/common';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { toSignal } from '@angular/core/rxjs-interop';

import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatInputModule } from '@angular/material/input';

import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { CoopLocation, CoopProfileService } from 'app/coop/services/coop-profile.service';

import { CoopAdminRegistration, CoopAdminService } from '../../services/coop-admin.service';
import { adminDetailQueryOptions } from '../../queries/coop-admin.queries';
import { locationsQueryOptions } from '../../queries/coop-profile.queries';
import { coopQueryKeys } from '../../queries/coop-query-keys';
import { extractCoopErrorMessage } from '../../queries/coop-error.util';

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
export class CoopAdminDetailComponent {
  // =====================================================
  // SERVICES
  // =====================================================

  private coopProfileService = inject(CoopProfileService);

  private fb = inject(FormBuilder);

  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private coopAdminService = inject(CoopAdminService);

  private queryClient = inject(QueryClient);

  // =====================================================
  // ROUTE ID
  // =====================================================

  private paramMap = toSignal(this.route.paramMap, { initialValue: null });

  private id = computed(() => {
    const idParam = this.paramMap()?.get('id');

    return idParam ? Number(idParam) : NaN;
  });

  // =====================================================
  // SERVER STATE (TanStack Query)
  // =====================================================

  private cooperativeQuery = injectQuery(() => adminDetailQueryOptions(this.coopAdminService, this.id()));

  private locationsQuery = injectQuery(() => locationsQueryOptions(this.coopProfileService));

  get cooperative(): CoopAdminRegistration | null {
    return this.cooperativeQuery.data() ?? null;
  }

  get loading(): boolean {
    return this.cooperativeQuery.isPending() || this.locationsQuery.isPending();
  }

  get loadError(): string {
    if (!Number.isFinite(this.id())) {
      return 'Invalid cooperative id.';
    }

    if (this.cooperativeQuery.isError()) {
      return extractCoopErrorMessage(this.cooperativeQuery.error(), 'Unable to load cooperative details.');
    }

    return '';
  }

  private locationNames = computed(() => {
    const cooperative = this.cooperativeQuery.data();

    const locations = this.locationsQuery.data();

    const fallback = { provinceName: '--', districtName: '--', localLevelName: '--' };

    if (!cooperative || !locations?.length) {
      return fallback;
    }

    const localLevelId = Number(cooperative.localLevelId);

    const location = locations.find((loc) => Number(loc.id) === localLevelId);

    if (!location) {
      return fallback;
    }

    return {
      provinceName: location.provinceNameEn || '--',
      districtName: location.districtNameEn || '--',
      localLevelName: location.localLevelNameEn || '--'
    };
  });

  get provinceName(): string {
    return this.locationNames().provinceName;
  }

  get districtName(): string {
    return this.locationNames().districtName;
  }

  get localLevelName(): string {
    return this.locationNames().localLevelName;
  }

  // =====================================================
  // MUTATIONS
  // =====================================================

  /**
   * All three mutations share the same aftermath: the
   * mutated cooperative's own detail is known from the
   * response (no refetch needed), while any cached
   * filtered/paginated list and the stats counts may now
   * be wrong and must be invalidated so the next read is
   * correct.
   */
  private applyMutationResult(updated: CoopAdminRegistration): void {
    this.queryClient.setQueryData(coopQueryKeys.admin.detail(updated.id), updated);

    this.queryClient.invalidateQueries({ queryKey: coopQueryKeys.admin.listRoot() });

    this.queryClient.invalidateQueries({ queryKey: coopQueryKeys.admin.stats() });
  }

  private verifyMutation = injectMutation(() => ({
    mutationFn: (variables: { id: number; remarks: string }) =>
      firstValueFrom(this.coopAdminService.verifyCooperative(variables.id, variables.remarks)),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private rejectMutation = injectMutation(() => ({
    mutationFn: (variables: { id: number; reason: string }) =>
      firstValueFrom(this.coopAdminService.rejectCooperative(variables.id, variables.reason)),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private activateMutation = injectMutation(() => ({
    mutationFn: (id: number) => firstValueFrom(this.coopAdminService.activateCooperative(id)),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  get isVerifying(): boolean {
    return this.verifyMutation.isPending();
  }

  get isRejecting(): boolean {
    return this.rejectMutation.isPending();
  }

  get isActivating(): boolean {
    return this.activateMutation.isPending();
  }

  // =====================================================
  // UI STATE
  // =====================================================

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

  // =====================================================
  // ACTIVATE FORM
  // =====================================================

  activateForm = this.fb.nonNullable.group({
    remarks: ['']
  });

  showActivateConfirm = false;

  // =====================================================
  // VERIFY COOPERATIVE
  // PENDING -> PROVISIONED
  // =====================================================

  submitVerify(): void {
    const cooperative = this.cooperative;

    if (!cooperative) {
      return;
    }

    this.successMessage = '';

    this.errorMessage = '';

    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();

      return;
    }

    const remarks = this.verifyForm.getRawValue().remarks;

    this.verifyMutation.mutate(
      { id: cooperative.id, remarks },
      {
        onSuccess: () => {
          this.successMessage = 'Cooperative verified and tenant provisioned successfully.';

          this.verifyForm.reset();
        },

        onError: (error) => {
          this.errorMessage = extractCoopErrorMessage(error, 'Unable to verify this cooperative. Please try again.');
        }
      }
    );
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
    const cooperative = this.cooperative;

    if (!cooperative) {
      return;
    }

    this.successMessage = '';

    this.errorMessage = '';

    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();

      return;
    }

    const reason = this.rejectForm.getRawValue().reason;

    this.rejectMutation.mutate(
      { id: cooperative.id, reason },
      {
        onSuccess: () => {
          this.successMessage = 'Cooperative has been rejected.';

          this.showRejectForm = false;

          this.rejectForm.reset();
        },

        onError: (error) => {
          this.errorMessage = extractCoopErrorMessage(error, 'Unable to reject this cooperative. Please try again.');
        }
      }
    );
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
    const cooperative = this.cooperative;

    if (!cooperative) {
      return;
    }

    if (cooperative.status !== 'PROVISIONED') {
      this.errorMessage = 'Only a provisioned tenant can be activated.';

      return;
    }

    this.successMessage = '';

    this.errorMessage = '';

    this.activateMutation.mutate(cooperative.id, {
      onSuccess: () => {
        this.successMessage = 'Tenant has been activated successfully.';

        this.showActivateConfirm = false;

        this.activateForm.reset();
      },

      onError: (error: any) => {
        if (error?.status === 403) {
          this.errorMessage =
            'You are not authorized to activate this tenant. Please check the backend authorization/permission for the activate endpoint.';
        } else {
          this.errorMessage = extractCoopErrorMessage(error, 'Unable to activate this tenant. Please try again.');
        }
      }
    });
  }
}
