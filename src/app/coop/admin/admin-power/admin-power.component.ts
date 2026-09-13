/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { CoopAdminNavbarComponent } from '../coop-admin-navbar/coop-admin-navbar.component';

import { CoopAdminRegistration, CoopAdminService } from '../../services/coop-admin.service';

import { adminDetailQueryOptions } from '../../queries/coop-admin.queries';
import { coopQueryKeys } from '../../queries/coop-query-keys';
import { extractCoopErrorMessage } from '../../queries/coop-error.util';

@Component({
  selector: 'mifosx-admin-power',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CoopAdminNavbarComponent
  ],

  templateUrl: './admin-power.component.html',
  styleUrl: './admin-power.component.scss'
})
export class AdminPowerComponent {
  // =====================================================
  // SERVICES
  // =====================================================

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly coopAdminService = inject(CoopAdminService);
  private readonly queryClient = inject(QueryClient);

  // =====================================================
  // ROUTE ID
  // =====================================================

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: null
  });

  /**
   * Route :id represents appUserId.
   *
   * Example:
   * /admin/29/power
   *
   * means appUserId = 29
   */
  readonly appUserId = computed(() => {
    const idParam = this.paramMap()?.get('id');

    return idParam ? Number(idParam) : NaN;
  });

  // =====================================================
  // COOPERATIVE QUERY
  // =====================================================

  private readonly cooperativeQuery = injectQuery(() =>
    adminDetailQueryOptions(this.coopAdminService, this.appUserId())
  );

  get cooperative(): CoopAdminRegistration | null {
    return this.cooperativeQuery.data() ?? null;
  }

  get loading(): boolean {
    return this.cooperativeQuery.isPending();
  }

  get loadError(): string {
    if (!Number.isFinite(this.appUserId())) {
      return 'Invalid cooperative id.';
    }

    if (this.cooperativeQuery.isError()) {
      return extractCoopErrorMessage(this.cooperativeQuery.error(), 'Unable to load cooperative details.');
    }

    return '';
  }

  // =====================================================
  // UI STATE
  // =====================================================

  successMessage = '';

  errorMessage = '';

  showRejectForm = false;

  //loader befor verifying and provisioning
  get isVerifyingAndProvisioning(): boolean {
    return this.verifyMutation.isPending();
  }

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

  rejectForm = this.fb.nonNullable.group({
    reason: ['']
  });

  // =====================================================
  // ACTIVATE FORM
  // =====================================================

  activateForm = this.fb.nonNullable.group({
    remarks: [
      '',
      Validators.required
    ]
  });

  // =====================================================
  // COMMON QUERY UPDATE
  // =====================================================

  private applyMutationResult(updated: CoopAdminRegistration): void {
    /**
     * Detail query is keyed by appUserId,
     * not registration id.
     */
    this.queryClient.setQueryData(coopQueryKeys.admin.detail(updated.appUserId), updated);

    this.queryClient.invalidateQueries({
      queryKey: coopQueryKeys.admin.listRoot()
    });

    this.queryClient.invalidateQueries({
      queryKey: coopQueryKeys.admin.stats()
    });
  }

  // =====================================================
  // VERIFY / PROVISION
  // PENDING -> PROVISIONED
  // =====================================================

  private readonly verifyMutation = injectMutation(() => ({
    mutationFn: (variables: { appUserId: number; remarks: string }) =>
      firstValueFrom(this.coopAdminService.verifyCooperative(variables.appUserId, variables.remarks)),

    onSuccess: (updated) => {
      this.applyMutationResult(updated);
    }
  }));

  get isVerifying(): boolean {
    return this.verifyMutation.isPending();
  }

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

    const remarks = this.verifyForm.getRawValue().remarks.trim();

    this.verifyMutation.mutate(
      {
        appUserId: cooperative.appUserId,
        remarks
      },
      {
        onSuccess: () => {
          this.successMessage = 'Cooperative verified and tenant provisioned successfully.';

          this.verifyForm.reset();

          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },

        onError: (error) => {
          this.errorMessage = extractCoopErrorMessage(error, 'Unable to verify this cooperative. Please try again.');
        }
      }
    );
  }

  // =====================================================
  // REJECT
  // PENDING -> REJECTED
  // =====================================================

  private readonly rejectMutation = injectMutation(() => ({
    mutationFn: (variables: { appUserId: number; reason: string }) =>
      firstValueFrom(this.coopAdminService.rejectCooperative(variables.appUserId, variables.reason)),

    onSuccess: (updated) => {
      this.applyMutationResult(updated);
    }
  }));

  get isRejecting(): boolean {
    return this.rejectMutation.isPending();
  }

  toggleRejectForm(): void {
    this.showRejectForm = !this.showRejectForm;

    this.errorMessage = '';
    this.successMessage = '';
  }

  submitReject(): void {
    const cooperative = this.cooperative;

    if (!cooperative) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    const reason = this.rejectForm.getRawValue().reason.trim();

    if (!reason) {
      this.errorMessage = 'Please provide a rejection reason.';

      return;
    }

    this.rejectMutation.mutate(
      {
        appUserId: cooperative.appUserId,
        reason
      },
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
  // ACTIVATE
  // PROVISIONED -> ACTIVE
  // =====================================================

  private readonly activateMutation = injectMutation(() => ({
    mutationFn: (appUserId: number) => firstValueFrom(this.coopAdminService.activateCooperative(appUserId)),

    onSuccess: (updated) => {
      this.applyMutationResult(updated);
    }
  }));

  get isActivating(): boolean {
    return this.activateMutation.isPending();
  }

  confirmActivate(): void {
    const cooperative = this.cooperative;

    if (!cooperative) {
      return;
    }

    if (cooperative.status !== 'PROVISIONED') {
      this.errorMessage = 'Only a provisioned tenant can be activated.';

      return;
    }

    if (this.activateForm.invalid) {
      this.activateForm.markAllAsTouched();

      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    this.activateMutation.mutate(cooperative.appUserId, {
      onSuccess: () => {
        this.successMessage = 'Tenant has been activated successfully.';

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

  // =====================================================
  // RELOAD
  // =====================================================

  reload(): void {
    this.successMessage = '';
    this.errorMessage = '';

    this.cooperativeQuery.refetch();
  }

  // =====================================================
  // BACK
  // =====================================================

  goBack(): void {
    this.router.navigate([
      '/coop',
      'admin',
      this.appUserId(),
      'documents'
    ]);
  }
}
