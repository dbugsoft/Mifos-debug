/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnDestroy, computed, effect, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';

import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { CoopAdminNavbarComponent } from '../coop-admin-navbar/coop-admin-navbar.component';
import {
  TenantAccessConfirmDialogComponent,
  TenantAccessConfirmDialogData,
  TenantAccessConfirmDialogResult
} from '../tenant-access-confirm-dialog/tenant-access-confirm-dialog.component';

import { CoopAdminRegistration, CoopAdminService, TenantRemediationReport } from '../../services/coop-admin.service';

import { adminDetailQueryOptions } from '../../queries/coop-admin.queries';
import { coopQueryKeys } from '../../queries/coop-query-keys';
import { extractCoopErrorMessage } from '../../queries/coop-error.util';
import { frontendUrlValidator, normalizeFrontendUrl } from '../../utils/frontend-url';
import {
  AccessBanner,
  accessEmailSummary,
  activationBanner,
  remediationActionLabel,
  remediationChangesAccess
} from '../../utils/tenant-access.util';

@Component({
  selector: 'mifosx-admin-power',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CoopAdminNavbarComponent
  ],

  templateUrl: './admin-power.component.html',
  styleUrls: [
    './admin-power.component.scss',
    './admin-power.tenant-access.scss'
  ]
})
export class AdminPowerComponent implements OnDestroy {
  // =====================================================
  // SERVICES
  // =====================================================

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly coopAdminService = inject(CoopAdminService);
  private readonly queryClient = inject(QueryClient);
  private readonly dialog = inject(MatDialog);
  private readonly clipboard = inject(Clipboard);
  private readonly datePipe = new DatePipe('en-US');

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

  /** Result banner shown right after activation, keyed on the email outcome. */
  activationResult: AccessBanner | null = null;

  /** The latest legacy-tenant security report (dry run or applied). */
  securityReport: TenantRemediationReport | null = null;

  /** Which value was just copied, so its button can say "Copied". */
  copiedField: string | null = null;

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  /** Full-page loader for actions that touch the tenant database and can take several seconds. */
  get busyOverlay(): { title: string; note: string } | null {
    if (this.isVerifying) {
      return { title: 'Verifying and Provisioning', note: 'It takes some time...' };
    }

    if (this.isActivating) {
      return {
        title: 'Activating Tenant',
        note: 'Enabling the administrator account and sending the sign-in email.'
      };
    }

    if (this.isResetting) {
      return { title: 'Resetting Administrator Access', note: 'Updating the tenant and emailing the cooperative.' };
    }

    if (this.isApplyingRemediation) {
      return { title: 'Securing Tenant', note: 'Replacing the default credentials in the tenant database.' };
    }

    return null;
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
  // HANDOVER FORMS
  // =====================================================

  /** PROVISIONED: where the cooperative will sign in, plus the admin's deployment confirmation. */
  handoverForm = this.fb.nonNullable.group({
    frontendUrl: [
      '',
      frontendUrlValidator()
    ],
    confirmedDeployed: [
      false,
      Validators.requiredTrue
    ]
  });

  /** ACTIVE (and legacy tenants): change the saved sign-in address. */
  editUrlForm = this.fb.nonNullable.group({
    frontendUrl: [
      '',
      frontendUrlValidator()
    ]
  });

  editingUrl = false;

  constructor() {
    // Pre-fill the handover address from a previously saved value, without overwriting what the admin typed.
    effect(() => {
      const cooperative = this.cooperativeQuery.data();
      const control = this.handoverForm.controls.frontendUrl;

      if (cooperative?.frontendUrl && control.pristine && !control.value) {
        control.setValue(cooperative.frontendUrl);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
    }
  }

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

    this.clearMessages();

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

    this.clearMessages();
  }

  submitReject(): void {
    const cooperative = this.cooperative;

    if (!cooperative) {
      return;
    }

    this.clearMessages();

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
  // TENANT ACCESS MUTATIONS
  // =====================================================

  private readonly activateMutation = injectMutation(() => ({
    mutationFn: (frontendUrl: string) =>
      firstValueFrom(this.coopAdminService.activateCooperative(this.appUserId(), frontendUrl)),

    onSuccess: (updated) => {
      this.applyMutationResult(updated);
    }
  }));

  private readonly frontendUrlMutation = injectMutation(() => ({
    mutationFn: (frontendUrl: string) =>
      firstValueFrom(this.coopAdminService.setFrontendUrl(this.appUserId(), frontendUrl)),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private readonly resendMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.coopAdminService.resendAccessEmail(this.appUserId())),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private readonly resetMutation = injectMutation(() => ({
    mutationFn: (reason: string) => firstValueFrom(this.coopAdminService.resetTenantAccess(this.appUserId(), reason)),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private readonly securityCheckMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.coopAdminService.checkTenantSecurity(this.appUserId()))
  }));

  private readonly remediationMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.coopAdminService.remediateTenant(this.appUserId())),

    // Remediation returns a report, not the registration, so re-read the detail.
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: coopQueryKeys.admin.detail(this.appUserId()) });

      this.queryClient.invalidateQueries({ queryKey: coopQueryKeys.admin.listRoot() });
    }
  }));

  get isActivating(): boolean {
    return this.activateMutation.isPending();
  }

  get isSavingUrl(): boolean {
    return this.frontendUrlMutation.isPending();
  }

  get isResending(): boolean {
    return this.resendMutation.isPending();
  }

  get isResetting(): boolean {
    return this.resetMutation.isPending();
  }

  get isCheckingSecurity(): boolean {
    return this.securityCheckMutation.isPending();
  }

  get isApplyingRemediation(): boolean {
    return this.remediationMutation.isPending();
  }

  /** Any tenant access action in flight - used to stop overlapping actions. */
  get isBusy(): boolean {
    return (
      this.isActivating ||
      this.isSavingUrl ||
      this.isResending ||
      this.isResetting ||
      this.isCheckingSecurity ||
      this.isApplyingRemediation
    );
  }

  // =====================================================
  // DERIVED VIEW STATE
  // =====================================================

  /** A provisioned/active tenant created before managed administrator accounts existed. */
  get isLegacyTenant(): boolean {
    const cooperative = this.cooperative;

    return (
      !!cooperative &&
      (cooperative.status === 'PROVISIONED' || cooperative.status === 'ACTIVE') &&
      !cooperative.tenantAdminUsername
    );
  }

  get normalizedHandoverUrl(): string | null {
    return normalizeFrontendUrl(this.handoverForm.controls.frontendUrl.value).value;
  }

  get canActivate(): boolean {
    return this.handoverForm.valid && !this.isBusy;
  }

  get emailStatusSummary(): string {
    return this.cooperative ? accessEmailSummary(this.cooperative, (iso) => this.formatDateTime(iso)) : '';
  }

  get emailStatusClass(): string {
    switch (this.cooperative?.accessEmailStatus) {
      case 'SENT':
        return 'sent';
      case 'FAILED':
        return 'failed';
      case 'NOT_CONFIGURED':
        return 'not-configured';
      default:
        return 'none';
    }
  }

  get securityReportRows(): { account: string; action: string }[] {
    const report = this.securityReport;

    if (!report) {
      return [];
    }

    return [
      {
        account: 'Administrator',
        action: remediationActionLabel(report.administrator.action, report.administrator.username)
      },
      { account: 'Internal system account', action: remediationActionLabel(report.system.action) },
      { account: 'Interoperation account', action: remediationActionLabel(report.interopUser.action) }
    ];
  }

  get securityReportChangesAccess(): boolean {
    return this.securityReport ? remediationChangesAccess(this.securityReport) : false;
  }

  /** Remediation that emails the cooperative cannot run until a sign-in address is saved. */
  get remediationNeedsFrontendUrl(): boolean {
    return !!this.securityReport?.emailsCooperative && !this.cooperative?.frontendUrl;
  }

  formatDateTime(iso: string | undefined): string {
    if (!iso) {
      return '—';
    }

    return this.datePipe.transform(iso, 'MMM d, y, h:mm a') ?? iso;
  }

  // =====================================================
  // ACTIVATE
  // PROVISIONED -> ACTIVE
  // =====================================================

  openActivateDialog(): void {
    const cooperative = this.cooperative;

    if (!cooperative) {
      return;
    }

    this.clearMessages();

    if (cooperative.status !== 'PROVISIONED') {
      this.errorMessage = 'Only a provisioned tenant can be activated.';

      return;
    }

    const frontendUrl = this.normalizedHandoverUrl;

    if (this.handoverForm.invalid || !frontendUrl) {
      this.handoverForm.markAllAsTouched();

      return;
    }

    const username = cooperative.tenantAdminUsername;

    if (!username) {
      this.errorMessage = 'This tenant predates managed administrator accounts. Run the security check first.';

      return;
    }

    this.openConfirmDialog(
      {
        title: 'Activate tenant and send sign-in email?',
        intro: `${cooperative.nameEn || 'This cooperative'} will sign in at ${frontendUrl}.`,
        points: [
          `The administrator account ${username} will be enabled.`,
          'For their first sign-in, the cooperative uses the password of the registry account that submitted this application.',
          'They must choose a new password immediately after signing in.',
          'The web address and username are emailed to the registrant. No password is sent.'
        ],
        confirmLabel: 'Activate and send email'
      },
      () =>
        this.activateMutation.mutate(frontendUrl, {
          onSuccess: (updated) => {
            this.activationResult = activationBanner(updated.accessEmailStatus);

            this.handoverForm.reset({ frontendUrl: '', confirmedDeployed: false });
          },

          onError: (error: any) => {
            if (error?.status === 403) {
              this.errorMessage =
                'You are not authorized to activate this tenant. Please check the backend authorization/permission for the activate endpoint.';
            } else {
              this.errorMessage = extractCoopErrorMessage(error, 'Unable to activate this tenant. Please try again.');
            }
          }
        })
    );
  }

  // =====================================================
  // SIGN-IN ADDRESS (ACTIVE and legacy tenants)
  // =====================================================

  startEditUrl(): void {
    this.clearMessages();

    this.editingUrl = true;

    this.editUrlForm.reset({ frontendUrl: this.cooperative?.frontendUrl ?? '' });
  }

  cancelEditUrl(): void {
    this.editingUrl = false;
  }

  saveFrontendUrl(): void {
    const cooperative = this.cooperative;

    if (!cooperative) {
      return;
    }

    this.clearMessages();

    const frontendUrl = normalizeFrontendUrl(this.editUrlForm.controls.frontendUrl.value).value;

    if (this.editUrlForm.invalid || !frontendUrl) {
      this.editUrlForm.markAllAsTouched();

      return;
    }

    this.frontendUrlMutation.mutate(frontendUrl, {
      onSuccess: (updated) => {
        this.editingUrl = false;

        this.successMessage =
          updated.status === 'ACTIVE' && !this.isLegacyTenant
            ? 'Sign-in address updated. The cooperative is not notified automatically: use "Resend sign-in email" to send them the new address.'
            : 'Sign-in address saved.';
      },

      onError: (error) => {
        this.errorMessage = extractCoopErrorMessage(error, 'Unable to save the sign-in address. Please try again.');
      }
    });
  }

  // =====================================================
  // SUPPORT ACTIONS (ACTIVE)
  // =====================================================

  resendEmail(): void {
    this.clearMessages();

    this.resendMutation.mutate(undefined, {
      onSuccess: (updated) => {
        switch (updated.accessEmailStatus) {
          case 'SENT':
            this.successMessage = 'Sign-in email sent to the cooperative.';
            break;
          case 'NOT_CONFIGURED':
            this.errorMessage = 'Email is not configured on the server, so nothing was sent.';
            break;
          default:
            this.errorMessage = 'The sign-in email could not be sent. The server may need its mail settings checked.';
        }
      },

      onError: (error) => {
        this.errorMessage = extractCoopErrorMessage(error, 'Unable to resend the sign-in email. Please try again.');
      }
    });
  }

  openResetDialog(): void {
    const cooperative = this.cooperative;

    if (!cooperative?.tenantIdentifier) {
      return;
    }

    this.clearMessages();

    this.openConfirmDialog(
      {
        title: 'Reset administrator access?',
        intro: `Use this when ${cooperative.nameEn || 'the cooperative'} is locked out of its administrator account.`,
        points: [
          'The administrator password the cooperative uses now will stop working immediately.',
          "The registry account's current password becomes the one-time sign-in password.",
          'A new password must be chosen at sign-in.',
          'The cooperative is emailed that access was reset. No password is sent.'
        ],
        confirmLabel: 'Reset access',
        destructive: true,
        reason: { label: 'Reason (recorded in the audit log)', minLength: 10 },
        typeToConfirm: cooperative.tenantIdentifier
      },
      (result) =>
        this.resetMutation.mutate(result.reason ?? '', {
          onSuccess: (updated) => {
            const email =
              updated.accessEmailStatus === 'SENT'
                ? 'The cooperative has been emailed.'
                : 'The notification email was not sent; tell the cooperative through a trusted channel.';

            this.successMessage = `Administrator access reset. ${email}`;
          },

          onError: (error) => {
            this.errorMessage = extractCoopErrorMessage(error, 'Unable to reset tenant access. Please try again.');
          }
        })
    );
  }

  // =====================================================
  // LEGACY TENANT SECURITY CHECK
  // =====================================================

  runSecurityCheck(): void {
    this.clearMessages();

    this.securityCheckMutation.mutate(undefined, {
      onSuccess: (report) => {
        this.securityReport = report;
      },

      onError: (error) => {
        this.errorMessage = extractCoopErrorMessage(error, 'Unable to check tenant security. Please try again.');
      }
    });
  }

  openApplyRemediation(): void {
    const cooperative = this.cooperative;
    const report = this.securityReport;

    if (!cooperative?.tenantIdentifier || !report) {
      return;
    }

    this.clearMessages();

    if (this.remediationNeedsFrontendUrl) {
      this.errorMessage = 'Set the sign-in address first.';

      return;
    }

    const points = report.emailsCooperative ? [
          'The shared default login this cooperative uses today stops working immediately.',
          "Their administrator signs in with the registry account's password and must choose a new one.",
          'They are emailed the new sign-in details. No password is sent.'
        ] : [
          'Default passwords are replaced and the account is disabled until the tenant is activated.'
        ];

    this.openConfirmDialog(
      {
        title: 'Secure this tenant?',
        points: [
          ...points,
          'Accounts whose password the cooperative already changed are left untouched.'
        ],
        confirmLabel: 'Apply changes',
        destructive: true,
        typeToConfirm: cooperative.tenantIdentifier
      },
      () =>
        this.remediationMutation.mutate(undefined, {
          onSuccess: (applied) => {
            this.securityReport = applied;

            const email = applied.accessEmailStatus
              ? applied.accessEmailStatus === 'SENT'
                ? ' The cooperative has been emailed new sign-in details.'
                : ' The email was not sent; give the cooperative the new sign-in details through a trusted channel.'
              : '';

            this.successMessage = `Tenant secured.${email}`;
          },

          onError: (error) => {
            this.errorMessage = extractCoopErrorMessage(error, 'Unable to secure this tenant. Please try again.');
          }
        })
    );
  }

  // =====================================================
  // RELOAD
  // =====================================================

  reload(): void {
    this.clearMessages();

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

  // =====================================================
  // HELPERS
  // =====================================================

  copy(value: string | undefined, field: string): void {
    if (!value || !this.clipboard.copy(value)) {
      return;
    }

    this.copiedField = field;

    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
    }

    this.copiedTimer = setTimeout(() => (this.copiedField = null), 2000);
  }

  private openConfirmDialog(
    data: TenantAccessConfirmDialogData,
    onConfirm: (result: TenantAccessConfirmDialogResult) => void
  ): void {
    this.dialog
      .open<TenantAccessConfirmDialogComponent, TenantAccessConfirmDialogData, TenantAccessConfirmDialogResult>(
        TenantAccessConfirmDialogComponent,
        { data, width: '560px', maxWidth: '95vw', restoreFocus: true }
      )
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          onConfirm(result);
        }
      });
  }

  private clearMessages(): void {
    this.successMessage = '';

    this.errorMessage = '';

    this.activationResult = null;
  }
}
