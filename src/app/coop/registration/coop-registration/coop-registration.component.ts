/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { CoopAuthService } from '../../services/coop-auth.service';
import { CoopPasswordChecklistComponent } from '../../shared/coop-password-checklist/coop-password-checklist.component';
import { coopPasswordValidator } from '../../utils/coop-password-policy';

@Component({
  selector: 'mifosx-coop-registration',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    CoopPasswordChecklistComponent
  ],
  templateUrl: './coop-registration.component.html',
  styleUrls: [
    './coop-registration.component.scss',
    './coop-registration.password.scss'
  ]
})
export class CoopRegistrationComponent {
  private fb = inject(FormBuilder);
  private coopAuthService = inject(CoopAuthService);
  private router = inject(Router);

  isSubmitting = false;
  hidePassword = true;
  successMessage = '';
  errorMessage = '';

  registrationForm = this.fb.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],

    // The registry password rules are added in the constructor: they depend on the email.
    password: [
      '',
      [
        Validators.required
      ]
    ],

    phone: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[0-9]{10}$/)
      ]
    ]
  });

  constructor() {
    const { email, password } = this.registrationForm.controls;

    password.addValidators(coopPasswordValidator(() => email.value));

    // "Must not contain your email name" depends on the email, so re-check the password when it changes.
    email.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => password.updateValueAndValidity({ emitEvent: false }));
  }

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const formValue = this.registrationForm.getRawValue();

    this.isSubmitting = true;

    this.coopAuthService
      .register({
        email: formValue.email,
        password: formValue.password,
        phone: formValue.phone
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;

          const userId = response.userId;

          if (!userId) {
            this.errorMessage = 'Registration succeeded but user ID was not returned.';
            return;
          }

          // Store userId for email verification, then go to OTP verification.
          localStorage.setItem('coopVerificationUserId', userId.toString());
          this.router.navigate(['/coop/verify-email']);
        },

        error: (error) => {
          this.isSubmitting = false;

          // The backend's message is written for the user, including password policy violations.
          const serverError = error?.error?.error || error?.error?.message || '';

          if (serverError.includes('status: VERIFIED') || serverError.includes('already registered')) {
            this.errorMessage = 'This email already exists and is verified. Please log in.';
            this.registrationForm.controls.email.setErrors({ alreadyExists: true });
          } else {
            this.errorMessage =
              serverError || 'Registration failed. Please check your inputs or network and try again.';
          }
        }
      });
  }
}
