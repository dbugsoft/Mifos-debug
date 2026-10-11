/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, effect, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { QueryClient, injectQuery } from '@tanstack/angular-query-experimental';

import { CoopNavbarComponent } from '../../coop-navbar/coop-navbar.component';
import { CoopPasswordChecklistComponent } from '../../shared/coop-password-checklist/coop-password-checklist.component';
import { CoopAuthService } from '../../services/coop-auth.service';
import { CoopProfileService } from '../../services/coop-profile.service';
import { CoopTokenService } from '../../services/coop-token.service';
import { meQueryOptions, statusQueryOptions } from '../../queries/coop-profile.queries';
import { clearCoopUserQueries } from '../../queries/coop-cache.util';
import { extractCoopErrorMessage } from '../../queries/coop-error.util';
import { coopPasswordValidator } from '../../utils/coop-password-policy';

/**
 * Changes the Cooperative Registry account password.
 *
 * The backend revokes every session on success, so this signs the user
 * out locally and sends them back to the login page.
 */
@Component({
  selector: 'mifosx-coop-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    CoopNavbarComponent,
    CoopPasswordChecklistComponent
  ],
  templateUrl: './coop-change-password.component.html',
  styleUrl: './coop-change-password.component.scss'
})
export class CoopChangePasswordComponent {
  private fb = inject(FormBuilder);

  private router = inject(Router);

  private queryClient = inject(QueryClient);

  private coopAuthService = inject(CoopAuthService);

  private coopProfileService = inject(CoopProfileService);

  private coopTokenService = inject(CoopTokenService);

  private meQuery = injectQuery(() => meQueryOptions(this.coopProfileService));

  private statusQuery = injectQuery(() => statusQueryOptions(this.coopProfileService));

  hideCurrent = true;

  hideNew = true;

  isSubmitting = false;

  errorMessage = '';

  form = this.fb.nonNullable.group(
    {
      currentPassword: [
        '',
        Validators.required
      ],
      newPassword: [
        '',
        Validators.required
      ],
      confirmPassword: [
        '',
        Validators.required
      ]
    },
    { validators: passwordsMatch }
  );

  constructor() {
    this.form.controls.newPassword.addValidators(coopPasswordValidator(() => this.email));

    // The email arrives after the form exists; re-check the email-name rule once it does.
    effect(() => {
      if (this.meQuery.data()) {
        this.form.controls.newPassword.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  get email(): string {
    return this.meQuery.data()?.email ?? this.statusQuery.data()?.email ?? '';
  }

  get isActive(): boolean {
    return this.statusQuery.data()?.status === 'ACTIVE';
  }

  submit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();

    if (currentPassword === newPassword) {
      this.errorMessage = 'New password must be different from the current password.';

      return;
    }

    this.isSubmitting = true;

    this.coopAuthService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.form.reset();

        // Every session was revoked server-side; drop the local one too.
        this.coopTokenService.clearSession();
        clearCoopUserQueries(this.queryClient);

        this.router.navigate(['/coop/login'], { queryParams: { passwordChanged: '1' } });
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = extractCoopErrorMessage(error, 'Unable to change your password. Please try again.');
      }
    });
  }
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;

  return newPassword && confirmPassword && newPassword !== confirmPassword ? { passwordsDoNotMatch: true } : null;
}
