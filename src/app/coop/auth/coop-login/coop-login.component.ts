/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../../auth-layout/auth-layout.component';
import { CoopAuthService } from '../../services/coop-auth.service';
import { CoopTokenService } from '../../services/coop-token.service';
import { MatIconModule } from '@angular/material/icon';

/** Used when a 429 carries neither a Retry-After header nor retryAfterMinutes. */
const DEFAULT_LOCKOUT_SECONDS = 15 * 60;

@Component({
  selector: 'mifosx-coop-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthLayoutComponent,
    MatIconModule
  ],
  templateUrl: './coop-login.component.html',
  styleUrl: './coop-login.component.scss'
})
export class CoopLoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private coopAuthService = inject(CoopAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private coopTokenService = inject(CoopTokenService);

  isSubmitting = false;
  hidePassword = true;
  successMessage = '';
  errorMessage = '';

  /** Seconds until a locked account may try again; 0 when not locked. */
  lockoutSecondsRemaining = 0;

  private lockoutTimer: ReturnType<typeof setInterval> | null = null;

  loginForm = this.fb.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],

    password: [
      '',
      [
        Validators.required
      ]
    ]
  });

  constructor() {
    if (this.route.snapshot.queryParamMap.get('passwordChanged') === '1') {
      this.successMessage = 'Password changed. Please sign in again with your new password.';
    }
  }

  get isLockedOut(): boolean {
    return this.lockoutSecondsRemaining > 0;
  }

  /** e.g. "14:05" */
  get lockoutCountdown(): string {
    const minutes = Math.floor(this.lockoutSecondsRemaining / 60);
    const seconds = this.lockoutSecondsRemaining % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.stopLockoutCountdown();
  }

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.isLockedOut) {
      return;
    }

    /* =========================
       FORM VALIDATION
    ========================= */

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();

      return;
    }

    const formValue = this.loginForm.getRawValue();

    this.isSubmitting = true;

    /* =========================
       LOGIN API
       Never log the response: it carries the access and refresh tokens.
    ========================= */

    this.coopAuthService
      .login({
        email: formValue.email,
        password: formValue.password
      })
      .subscribe({
        next: (response) => {
          /* =========================
           VERIFIED / ACTIVE USER

           Customer: isEmailVerified = true, status = VERIFIED
           Admin:    isEmailVerified = true, status = ACTIVE

           Both are valid login responses.
          ========================= */

          if (response.isEmailVerified === true && (response.status === 'VERIFIED' || response.status === 'ACTIVE')) {
            this.coopTokenService.setSession({
              accessToken: response.accessToken,

              refreshToken: response.refreshToken,

              tokenType: response.tokenType,

              expiresIn: response.expiresIn,

              status: response.status === 'ACTIVE' ? 'VERIFIED' : response.status
            });

            this.isSubmitting = false;

            this.successMessage = 'Login successful. Redirecting...';

            /* =========================
             ROLE BASED REDIRECT
            ========================= */

            let destination = '/coop/profile';

            try {
              destination = this.coopTokenService.isAdmin() ? '/coop/admin' : '/coop/profile';
            } catch {
              // Safe fallback for normal cooperative users.
              destination = '/coop/profile';
            }

            this.router.navigate([
              destination
            ]);

            return;
          }

          /* =========================
           UNVERIFIED USER
          ========================= */

          if (response.status === 'UNVERIFIED') {
            this.handleUnverifiedUser(formValue.email);

            return;
          }

          /* =========================
           UNKNOWN STATUS
          ========================= */

          this.isSubmitting = false;

          this.errorMessage = 'Unable to determine your account status.';
        },

        error: (error) => {
          const serverError = error?.error?.error || error?.error?.message || error?.error?.defaultUserMessage || '';

          /* =========================
           LOCKED AFTER REPEATED FAILURES
          ========================= */

          if (error?.status === 429) {
            this.isSubmitting = false;

            this.errorMessage = serverError || 'Too many failed sign-in attempts. Please try again later.';

            this.startLockoutCountdown(retryAfterSeconds(error));

            return;
          }

          /* =========================
           EMAIL NOT VERIFIED
          ========================= */

          if (error?.status === 403 && serverError.includes('Email not verified')) {
            this.handleUnverifiedUser(this.loginForm.getRawValue().email);

            return;
          }

          /* =========================
           OTHER ERRORS
          ========================= */

          this.isSubmitting = false;

          this.errorMessage = serverError || 'Login failed. Please check your email and password.';
        }
      });
  }

  // =====================================================
  // LOCKOUT COUNTDOWN
  // =====================================================

  private startLockoutCountdown(seconds: number): void {
    this.stopLockoutCountdown();

    this.lockoutSecondsRemaining = Math.max(1, Math.ceil(seconds));

    this.lockoutTimer = setInterval(() => {
      this.lockoutSecondsRemaining -= 1;

      if (this.lockoutSecondsRemaining <= 0) {
        this.stopLockoutCountdown();

        this.errorMessage = '';
      }
    }, 1000);
  }

  private stopLockoutCountdown(): void {
    if (this.lockoutTimer) {
      clearInterval(this.lockoutTimer);

      this.lockoutTimer = null;
    }

    this.lockoutSecondsRemaining = 0;
  }

  // =====================================================
  // HANDLE UNVERIFIED USER
  // =====================================================

  private handleUnverifiedUser(email: string): void {
    this.isSubmitting = true;

    this.coopAuthService
      .resendOtp({
        email: email
      })
      .subscribe({
        next: (resendResponse) => {
          this.isSubmitting = false;

          const userId = resendResponse.userId;

          if (!userId) {
            this.errorMessage = 'OTP was sent, but user ID was not returned.';

            return;
          }

          this.successMessage = resendResponse.message || 'A new OTP has been sent to your email.';

          setTimeout(() => {
            this.router.navigate(['/coop/verify-email'], {
              queryParams: {
                userId: userId
              }
            });
          }, 1000);
        },

        error: (error) => {
          this.isSubmitting = false;

          this.errorMessage =
            error?.error?.message ||
            error?.error?.error ||
            error?.error?.defaultUserMessage ||
            'Unable to resend OTP. Please try again.';
        }
      });
  }
}

/** Seconds to wait, from the Retry-After header when readable, else the response body. */
function retryAfterSeconds(error: {
  headers?: { get?: (name: string) => string | null };
  error?: { retryAfterMinutes?: number };
}): number {
  const header = Number(error?.headers?.get?.('Retry-After'));

  if (Number.isFinite(header) && header > 0) {
    return header;
  }

  const minutes = Number(error?.error?.retryAfterMinutes);

  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : DEFAULT_LOCKOUT_SECONDS;
}
