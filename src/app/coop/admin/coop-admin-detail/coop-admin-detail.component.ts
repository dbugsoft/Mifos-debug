/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnDestroy, computed, effect, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Clipboard } from '@angular/cdk/clipboard';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { CoopProfileService } from 'app/coop/services/coop-profile.service';

import { CoopAdminNavbarComponent } from '../coop-admin-navbar/coop-admin-navbar.component';
import {
  TenantAccessConfirmDialogComponent,
  TenantAccessConfirmDialogData,
  TenantAccessConfirmDialogResult
} from '../tenant-access-confirm-dialog/tenant-access-confirm-dialog.component';
import { CoopAdminRegistration, CoopAdminService, TenantRemediationReport } from '../../services/coop-admin.service';
import { adminDetailQueryOptions } from '../../queries/coop-admin.queries';
import { locationsQueryOptions } from '../../queries/coop-profile.queries';
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
  selector: 'mifosx-coop-admin-detail',

  standalone: true,

  imports: [
    CoopAdminNavbarComponent,
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],

  templateUrl: './coop-admin-detail.component.html',

  styleUrls: [
    './coop-admin-detail.component.scss',
    './coop-admin-detail.tenant-access.scss'
  ]
})
export class CoopAdminDetailComponent implements OnDestroy {
  // =====================================================
  // SERVICES
  // =====================================================

  private coopProfileService = inject(CoopProfileService);

  private fb = inject(FormBuilder);

  private route = inject(ActivatedRoute);

  private coopAdminService = inject(CoopAdminService);

  private queryClient = inject(QueryClient);

  private dialog = inject(MatDialog);

  private clipboard = inject(Clipboard);

  private datePipe = new DatePipe('en-US');

  // =====================================================
  // ROUTE ID
  // =====================================================

  private paramMap = toSignal(this.route.paramMap, { initialValue: null });

  /**
   * The route parameter is the registry account id (appUserId).
   * Every admin endpoint addresses a cooperative by it - the
   * registration row's own `id` is never accepted by the API.
   */
  private appUserId = computed(() => {
    const idParam = this.paramMap()?.get('id');

    return idParam ? Number(idParam) : NaN;
  });

  // =====================================================
  // SERVER STATE (TanStack Query)
  // =====================================================

  private cooperativeQuery = injectQuery(() => adminDetailQueryOptions(this.coopAdminService, this.appUserId()));

  private locationsQuery = injectQuery(() => locationsQueryOptions(this.coopProfileService));

  get cooperative(): CoopAdminRegistration | null {
    return this.cooperativeQuery.data() ?? null;
  }

  get loading(): boolean {
    return this.cooperativeQuery.isPending() || this.locationsQuery.isPending();
  }

  /** Fixed field counts for the shimmer skeleton's detail-grid sections. */
  readonly skeletonFields6 = Array.from({ length: 6 });
  readonly skeletonFields4 = Array.from({ length: 4 });
  readonly skeletonFields3 = Array.from({ length: 3 });
  readonly skeletonFields2 = Array.from({ length: 2 });

  get loadError(): string {
    if (!Number.isFinite(this.appUserId())) {
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
   * Every registration-returning mutation shares the same
   * aftermath: the mutated cooperative's own detail is known
   * from the response (no refetch needed), while any cached
   * filtered/paginated list and the stats counts may now be
   * wrong and must be invalidated so the next read is correct.
   */
  private applyMutationResult(updated: CoopAdminRegistration): void {
    this.queryClient.setQueryData(coopQueryKeys.admin.detail(this.appUserId()), updated);

    this.queryClient.invalidateQueries({ queryKey: coopQueryKeys.admin.listRoot() });

    this.queryClient.invalidateQueries({ queryKey: coopQueryKeys.admin.stats() });
  }

  private verifyMutation = injectMutation(() => ({
    mutationFn: (remarks: string) => firstValueFrom(this.coopAdminService.verifyCooperative(this.appUserId(), remarks)),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private rejectMutation = injectMutation(() => ({
    mutationFn: (reason: string) => firstValueFrom(this.coopAdminService.rejectCooperative(this.appUserId(), reason)),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private activateMutation = injectMutation(() => ({
    mutationFn: (frontendUrl: string) =>
      firstValueFrom(this.coopAdminService.activateCooperative(this.appUserId(), frontendUrl)),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private frontendUrlMutation = injectMutation(() => ({
    mutationFn: (frontendUrl: string) =>
      firstValueFrom(this.coopAdminService.setFrontendUrl(this.appUserId(), frontendUrl)),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private resendMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.coopAdminService.resendAccessEmail(this.appUserId())),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private resetMutation = injectMutation(() => ({
    mutationFn: (reason: string) => firstValueFrom(this.coopAdminService.resetTenantAccess(this.appUserId(), reason)),

    onSuccess: (updated) => this.applyMutationResult(updated)
  }));

  private securityCheckMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.coopAdminService.checkTenantSecurity(this.appUserId()))
  }));

  private remediationMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.coopAdminService.remediateTenant(this.appUserId())),

    // Remediation returns a report, not the registration, so re-read the detail.
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: coopQueryKeys.admin.detail(this.appUserId()) });

      this.queryClient.invalidateQueries({ queryKey: coopQueryKeys.admin.listRoot() });
    }
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

  /** Full-screen overlay for actions that touch the tenant database and can take several seconds. */
  get busyOverlay(): { title: string; note: string } | null {
    if (this.isVerifying) {
      return {
        title: 'Verifying & Provisioning Tenant',
        note: 'This process may take some time. Please do not refresh or close this page.'
      };
    }

    if (this.isActivating) {
      return {
        title: 'Activating Tenant',
        note: 'Enabling the administrator account and sending the sign-in email. Please do not close this page.'
      };
    }

    if (this.isResetting) {
      return {
        title: 'Resetting Administrator Access',
        note: 'Updating the tenant and emailing the cooperative. Please do not close this page.'
      };
    }

    if (this.isApplyingRemediation) {
      return {
        title: 'Securing Tenant',
        note: 'Replacing the default credentials in the tenant database. Please do not close this page.'
      };
    }

    return null;
  }

  // =====================================================
  // UI STATE
  // =====================================================

  successMessage = '';

  errorMessage = '';

  /** Result banner shown right after activation, keyed on the email outcome. */
  activationResult: AccessBanner | null = null;

  /** The latest legacy-tenant security report (dry run or applied). */
  securityReport: TenantRemediationReport | null = null;

  /** Which value was just copied, so its button can say "Copied". */
  copiedField: string | null = null;

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  // =====================================================
  // FORMS
  // =====================================================

  verifyForm = this.fb.nonNullable.group({
    remarks: [
      '',
      Validators.required
    ]
  });

  showRejectForm = false;

  rejectForm = this.fb.nonNullable.group({
    reason: [
      '',
      Validators.required
    ]
  });

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
  // VERIFY COOPERATIVE
  // PENDING -> PROVISIONED
  // =====================================================

  submitVerify(): void {
    if (!this.cooperative) {
      return;
    }

    this.clearMessages();

    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();

      return;
    }

    this.verifyMutation.mutate(this.verifyForm.getRawValue().remarks, {
      onSuccess: () => {
        this.successMessage = 'Cooperative verified and tenant provisioned successfully.';

        this.verifyForm.reset();
      },

      onError: (error) => {
        this.errorMessage = extractCoopErrorMessage(error, 'Unable to verify this cooperative. Please try again.');
      }
    });
  }

  // =====================================================
  // REJECT COOPERATIVE
  // =====================================================

  toggleRejectForm(): void {
    this.showRejectForm = !this.showRejectForm;

    this.clearMessages();
  }

  submitReject(): void {
    if (!this.cooperative) {
      return;
    }

    this.clearMessages();

    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();

      return;
    }

    this.rejectMutation.mutate(this.rejectForm.getRawValue().reason, {
      onSuccess: () => {
        this.successMessage = 'Cooperative has been rejected.';

        this.showRejectForm = false;

        this.rejectForm.reset();
      },

      onError: (error) => {
        this.errorMessage = extractCoopErrorMessage(error, 'Unable to reject this cooperative. Please try again.');
      }
    });
  }

  // =====================================================
  // ACTIVATE TENANT
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

          onError: (error) => {
            this.errorMessage = extractCoopErrorMessage(error, 'Unable to activate this tenant. Please try again.');
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
