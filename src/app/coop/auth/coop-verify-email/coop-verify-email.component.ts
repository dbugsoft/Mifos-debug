/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router } from '@angular/router';
import { timeout } from 'rxjs';
import { CoopAuthService } from '../../services/coop-auth.service';

/** Caps how long the "Verifying..." state can show for a wrong/slow OTP response. */
const VERIFY_TIMEOUT_MS = 1000;

@Component({
  selector: 'mifosx-coop-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './coop-verify-email.component.html',
  styleUrl: './coop-verify-email.component.scss'
})
export class CoopVerifyEmailComponent {
  private fb = inject(FormBuilder);
  private coopAuthService = inject(CoopAuthService);
  private router = inject(Router);

  isSubmitting = false;

  successMessage = '';
  errorMessage = '';

  /**
   * User ID used for email verification
   */
  userId: string | null = null;

  /**
   * OTP form
   */
  verifyForm = this.fb.nonNullable.group({
    otp: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[0-9]{6}$/)
      ]
    ]
  });

  constructor() {
    const storedUserId = localStorage.getItem('coopVerificationUserId');

    this.userId = storedUserId ? String(storedUserId) : null;

    console.log('Verify page userId from localStorage:', this.userId);
  }

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    /* =========================
       FORM VALIDATION
    ========================= */

    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();

      return;
    }

    /* =========================
       CHECK USER ID
    ========================= */

    if (!this.userId) {
      this.errorMessage = 'Registration information was not found. Please register again.';

      return;
    }

    const otp = this.verifyForm.getRawValue().otp;

    console.log('Verifying user:', this.userId);

    this.isSubmitting = true;

    /* =========================
       VERIFY EMAIL API
    ========================= */

    this.coopAuthService
      .verifyEmail({
        userId: this.userId,
        otp: otp
      })
      .pipe(timeout(VERIFY_TIMEOUT_MS))
      .subscribe({
        /* =========================
         SUCCESS
      ========================= */

        next: (response) => {
          console.log('Email verification successful:', response);

          this.isSubmitting = false;

          /*
           * Remove temporary verification userId
           * after successful verification.
           */

          localStorage.removeItem('coopVerificationUserId');

          console.log('Verification userId removed from localStorage.');

          this.successMessage = response?.message ?? '';

          /* =========================
           REDIRECT TO LOGIN
        ========================= */

          setTimeout(() => {
            console.log('Redirecting to Coop Login...');

            this.router.navigate([
              '/coop/login'
            ]);
          }, 1500);
        },

        /* =========================
         ERROR
      ========================= */

        error: (error) => {
          console.error('Email verification failed:', error);

          this.isSubmitting = false;

          // Show the exact error message returned by the backend.
          this.errorMessage = error?.error?.error ?? '';
        }
      });
  }
}

/**
 * Reads the OTP attempts-remaining count off a failed verify-email
 * response, trying every field name the backend might use for it.
 * Returns `null` when none is present, so the error message falls
 * back to a plain message instead of showing a wrong/missing number.
 */
function extractAttemptsRemaining(error: unknown): number | null {
  const body = (error as { error?: Record<string, unknown> })?.error;

  if (!body) {
    return null;
  }

  const candidates = [
    body.attemptsRemaining,
    body.remainingAttempts,
    body.attempts_remaining,
    body.remaining_attempts
  ];

  const value = candidates.find((candidate) => typeof candidate === 'number' && Number.isFinite(candidate));

  return typeof value === 'number' ? value : null;
}
