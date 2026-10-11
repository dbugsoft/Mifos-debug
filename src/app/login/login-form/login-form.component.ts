/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

/** rxjs Imports */
import { finalize } from 'rxjs/operators';

/** Custom Services */
import { AuthenticationService } from '../../core/authentication/authentication.service';
import {
  ACCOUNT_LOCKED_CODE,
  EMAIL_NOT_VERIFIED_CODE,
  StaffAccessService,
  fineractErrorCode
} from '../../core/authentication/staff-access.service';
import { MatPrefix } from '@angular/material/form-field';
import { M3IconComponent } from '../../shared/m3-ui/m3-icon/m3-icon.component';
import { M3ButtonComponent } from '../../shared/m3-ui/m3-button/m3-button.component';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { environment } from '../../../environments/environment';

/**
 * Login form component.
 */
@Component({
  selector: 'mifosx-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatPrefix,
    M3IconComponent,
    M3ButtonComponent,
    MatProgressBar,
    MatProgressSpinner
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authenticationService = inject(AuthenticationService);
  private translateService = inject(TranslateService);
  private staffAccess = inject(StaffAccessService);
  minPasswordLength = environment.minPasswordLength;

  /** Login form group. */
  loginForm: FormGroup;
  /** Password input field type. */
  passwordInputType: string = 'password';
  /** True if loading. */
  loading = false;
  /** Whether OAuth (OIDC or OAuth2) is enabled */
  oauthEnabled = environment.OIDC.oidcServerEnabled || environment.oauth.enabled;
  /** Whether remember me functionality is enabled */
  enableRememberMe = environment.enableRememberMe === true;
  /** The username of an account the last sign-in found locked, to offer a reset that unlocks it. */
  lockedUsername = signal<string | null>(null);

  /**
   * Creates login form.
   *
   * Initializes password input field type.
   */
  ngOnInit() {
    this.createLoginForm();
    if (this.staffAccess.signInAs()) {
      this.loginForm.patchValue({ username: this.staffAccess.signInAs() });
      this.staffAccess.signInAs.set('');
    }
  }

  /**
   * Authenticates the user if the credentials are valid.
   */
  login() {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      return;
    }
    const { username, password } = this.loginForm.value;
    this.lockedUsername.set(null);
    this.loading = true;
    this.loginForm.disable();
    this.authenticationService
      .login(this.loginForm.value)
      .pipe(
        finalize(() => {
          this.loginForm.reset();
          this.loginForm.markAsPristine();
          // Angular Material Bug: Validation errors won't get removed on reset.
          this.loginForm.enable();
          this.loading = false;
        })
      )
      .subscribe({ error: (error: HttpErrorResponse) => this.onSignInRefused(error, username, password) });
  }

  /** Opens "Forgot password?", carrying over the username typed so far. */
  forgotPassword(username?: string) {
    this.staffAccess.showResetPassword(username ?? this.loginForm.value.username ?? '');
  }

  /**
   * A locked account gets a notice with a way out; an unverified email moves on to the verification step, which
   * signs in again with the same credentials once the code is confirmed (fineract-dbug ADR 0019).
   */
  private onSignInRefused(error: HttpErrorResponse, username: string, password: string) {
    const code = fineractErrorCode(error.error);
    if (code === ACCOUNT_LOCKED_CODE) {
      this.lockedUsername.set(username);
    } else if (code === EMAIL_NOT_VERIFIED_CODE) {
      this.staffAccess.showVerifyEmail(username, password, error.error?.maskedEmail ?? '');
    }
  }

  /**
   * Initiates OAuth/OIDC login flow.
   * The unified AuthenticationService handles both Fineract OAuth2 and OIDC providers.
   */
  loginOAuth() {
    this.loading = true;
    this.authenticationService
      .login()
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        error: (err) => {
          console.error('OAuth/OIDC login failed:', err);
        }
      });
  }

  /**
   * Toggles the visibility of the password input field.
   *
   * Changes the input type between 'password' and 'text'.
   */
  togglePasswordVisibility() {
    this.passwordInputType = this.passwordInputType === 'password' ? 'text' : 'password';
  }

  /**
   * Creates login form with validation rules.
   */
  private createLoginForm() {
    this.loginForm = this.formBuilder.group({
      username: [
        '',
        Validators.required
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(environment.minPasswordLength)
        ]
      ],
      remember: false
    });
  }

  /**
   * Returns the appropriate error message for the specified form control.
   *
   * @param {string} controlName - The name of the form control.
   * @returns {string} - The error message.
   */

  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);
    if (control?.hasError('required')) {
      return this.translateService.instant('errors.validation.required');
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength']?.requiredLength;
      return this.translateService.instant('errors.validation.minLength', { requiredLength });
    }

    return '';
  }

  onEnter(event: any): void {
    this.login();
  }
}
