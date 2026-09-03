/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CoopAuthService } from '../../services/coop-auth.service';
import { CoopTokenService } from '../../services/coop-token.service';

@Component({
  selector: 'mifosx-coop-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './coop-login.component.html',
  styleUrl: './coop-login.component.scss'
})
export class CoopLoginComponent {
  private fb = inject(FormBuilder);
  private coopAuthService = inject(CoopAuthService);
  private router = inject(Router);
  private coopTokenService = inject(CoopTokenService);

  isSubmitting = false;

  successMessage = '';
  errorMessage = '';

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

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    console.log('1. Login button clicked');

    /* =========================
       FORM VALIDATION
    ========================= */

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();

      return;
    }

    const formValue = this.loginForm.getRawValue();

    this.isSubmitting = true;

    console.log('2. Calling login API');

    /* =========================
       LOGIN API
    ========================= */

    this.coopAuthService
      .login({
        email: formValue.email,
        password: formValue.password
      })
      .subscribe({
        /* =========================
         LOGIN SUCCESS
      ========================= */

        next: (response) => {
          console.log('LOGIN SUCCESS RESPONSE:', response);

          console.log('isEmailVerified:', response.isEmailVerified);

          console.log('status:', response.status);

          console.log('accessToken:', response.accessToken);

          console.log('refreshToken:', response.refreshToken);

          /* =========================
           VERIFIED / ACTIVE USER
        =========================
         
         Customer:
           isEmailVerified = true
           status = VERIFIED

         Admin:
           isEmailVerified = true
           status = ACTIVE

         Both are valid login responses.
        */

          if (response.isEmailVerified === true && (response.status === 'VERIFIED' || response.status === 'ACTIVE')) {
            console.log('VALID LOGIN RESPONSE');

            /* =========================
             SAVE TOKENS
          ========================= */

            this.coopTokenService.setSession({
              accessToken: response.accessToken,

              refreshToken: response.refreshToken,

              tokenType: response.tokenType,

              expiresIn: response.expiresIn,

              status: response.status === 'ACTIVE' ? 'VERIFIED' : response.status
            });

            console.log('AUTH SESSION SAVED:', this.coopTokenService.getSession());

            /*
             * Stop loading immediately after
             * successful login.
             */

            this.isSubmitting = false;

            this.successMessage = 'Login successful. Redirecting...';

            /* =========================
             ROLE BASED REDIRECT
          ========================= */

            let destination = '/coop/profile';

            try {
              const isAdmin = this.coopTokenService.isAdmin();

              console.log('IS ADMIN:', isAdmin);

              if (isAdmin) {
                destination = '/coop/admin';

                console.log('Redirecting to ADMIN dashboard');
              } else {
                destination = '/coop/profile';

                console.log('Redirecting to COOP profile');
              }
            } catch (error) {
              console.error('Role detection failed:', error);

              /*
               * Safe fallback for normal
               * cooperative users.
               */

              destination = '/coop/profile';
            }

            console.log('FINAL DESTINATION:', destination);

            /* =========================
             NAVIGATE
          ========================= */

            this.router.navigate([
              destination
            ]);

            return;
          }

          /* =========================
           UNVERIFIED USER
        ========================= */

          if (response.status === 'UNVERIFIED') {
            console.log('USER IS UNVERIFIED');

            this.handleUnverifiedUser(formValue.email);

            return;
          }

          /* =========================
           UNKNOWN STATUS
        ========================= */

          this.isSubmitting = false;

          console.log('UNKNOWN LOGIN STATUS:', response.status);

          this.errorMessage = 'Unable to determine your account status.';
        },

        /* =========================
         LOGIN ERROR
      ========================= */

        error: (error) => {
          console.error('LOGIN API ERROR:', error);

          const serverError = error?.error?.error || error?.error?.message || error?.error?.defaultUserMessage || '';

          /* =========================
           EMAIL NOT VERIFIED
        ========================= */

          if (error.status === 403 && serverError.includes('Email not verified')) {
            console.log('EMAIL NOT VERIFIED - RESENDING OTP');

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
  // HANDLE UNVERIFIED USER
  // =====================================================

  private handleUnverifiedUser(email: string): void {
    this.isSubmitting = true;

    console.log('Resending OTP for:', email);

    this.coopAuthService
      .resendOtp({
        email: email
      })
      .subscribe({
        /* =========================
         RESEND OTP SUCCESS
      ========================= */

        next: (resendResponse) => {
          this.isSubmitting = false;

          console.log('OTP RESEND SUCCESS:', resendResponse);

          const userId = resendResponse.userId;

          if (!userId) {
            this.errorMessage = 'OTP was sent, but user ID was not returned.';

            return;
          }

          this.successMessage = resendResponse.message || 'A new OTP has been sent to your email.';

          /* =========================
           NAVIGATE TO VERIFY EMAIL
        ========================= */

          setTimeout(() => {
            this.router.navigate(['/coop/verify-email'], {
              queryParams: {
                userId: userId
              }
            });
          }, 1000);
        },

        /* =========================
         RESEND OTP ERROR
      ========================= */

        error: (error) => {
          this.isSubmitting = false;

          console.error('RESEND OTP ERROR:', error);

          this.errorMessage =
            error?.error?.message ||
            error?.error?.error ||
            error?.error?.defaultUserMessage ||
            'Unable to resend OTP. Please try again.';
        }
      });
  }
}
