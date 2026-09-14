/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

/** rxjs Imports */
import { finalize } from 'rxjs/operators';

/** Custom Services */
import { AuthenticationService } from '../../core/authentication/authentication.service';

/** Custom Validators */
import { confirmPasswordValidator } from './confirm-password.validator';
import { PasswordsUtility } from 'app/core/utils/passwords-utility';
import { passwordValidator } from 'app/core/utils/password.validator';
import { PasswordRule, passwordRuleChecklist } from 'app/core/utils/password-rules';
import { MatDivider } from '@angular/material/divider';
import { MatFormField, MatPrefix, MatLabel, MatSuffix, MatError } from '@angular/material/form-field';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Reset password component.
 *
 * Shown when Fineract answers a sign-in with shouldRenewPassword: an expired
 * password, or a cooperative administrator's first sign-in with its one-time
 * password. The rule checklist is derived from the same validator the form
 * uses, so what is shown cannot drift from what is enforced.
 */
@Component({
  selector: 'mifosx-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDivider,
    MatPrefix,
    FaIconComponent,
    MatIconButton,
    MatProgressSpinner
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authenticationService = inject(AuthenticationService);
  private passwordsUtility = inject(PasswordsUtility);

  /** The validator behind the password field, reused to drive the rule checklist. */
  private readonly validatePassword = passwordValidator();

  /** Reset password form group. */
  resetPasswordForm: FormGroup;
  /** Password input field type. */
  passwordInputType: string;
  /** True if loading. */
  loading = false;

  /** Live state of each password rule for the value currently typed. */
  get passwordRules(): PasswordRule[] {
    return passwordRuleChecklist(
      this.resetPasswordForm?.controls['password']?.value,
      this.passwordsUtility.minPasswordLength,
      this.validatePassword
    );
  }

  /**
   * Creates reset password form.
   *
   * Initializes password input field type.
   */
  ngOnInit() {
    this.createResetPasswordForm();
    this.passwordInputType = 'password';
  }

  /**
   * Resets the password of user.
   */
  resetPassword() {
    this.loading = true;
    this.resetPasswordForm.disable();
    this.authenticationService
      .resetPassword(this.resetPasswordForm.value)
      .pipe(
        finalize(() => {
          this.resetPasswordForm.reset();
          this.resetPasswordForm.markAsPristine();
          // Angular Material Bug: Validation errors won't get removed on reset.
          this.resetPasswordForm.enable();
          this.loading = false;
        })
      )
      .subscribe();
  }

  /**
   * Creates reset password form.
   */
  private createResetPasswordForm() {
    this.resetPasswordForm = this.formBuilder.group(
      {
        password: [
          '',
          this.passwordsUtility.getPasswordValidators()
        ],
        repeatPassword: [
          '',
          Validators.required
        ]
      },
      { validator: confirmPasswordValidator }
    );
  }
}
