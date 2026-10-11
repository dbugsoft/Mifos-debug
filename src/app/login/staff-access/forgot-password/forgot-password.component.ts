/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { MatPrefix } from '@angular/material/form-field';
import { MatIconButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AlertService } from '../../../core/alert/alert.service';
import { StaffAccessService } from '../../../core/authentication/staff-access.service';
import { PasswordsUtility } from '../../../core/utils/passwords-utility';
import { passwordValidator } from '../../../core/utils/password.validator';
import { PasswordRule, passwordRuleChecklist } from '../../../core/utils/password-rules';
import { confirmPasswordValidator } from '../../reset-password/confirm-password.validator';
import { M3IconComponent } from '../../../shared/m3-ui/m3-icon/m3-icon.component';
import { M3ButtonComponent } from '../../../shared/m3-ui/m3-button/m3-button.component';
import { staffAccessErrorText } from '../staff-access-errors';

/**
 * "Forgot password?" on the sign-in card (fineract-dbug ADR 0019). A staff member asks for a code at their verified
 * email address, then sets a new password with it. This also unlocks an account locked by wrong passwords.
 *
 * The backend gives the same answer whether or not the account exists, so the screen never says whether a code was
 * sent to anyone in particular.
 */
@Component({
  selector: 'mifosx-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../staff-access-step.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatPrefix,
    MatIconButton,
    MatProgressSpinner,
    M3IconComponent,
    M3ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordComponent implements OnInit {
  private staffAccess = inject(StaffAccessService);
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);
  private passwordsUtility = inject(PasswordsUtility);
  private readonly validatePassword = passwordValidator();
  private formBuilder = inject(FormBuilder).nonNullable;

  /** The username typed on the sign-in form, if any. */
  readonly username = input('');

  readonly requestForm = this.formBuilder.group({
    username: [
      '',
      Validators.required
    ]
  });

  readonly resetForm = this.formBuilder.group(
    {
      code: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{6}$/)
        ]
      ],
      password: [
        '',
        this.passwordsUtility.getPasswordValidators()
      ],
      repeatPassword: [
        '',
        Validators.required
      ]
    },
    { validators: confirmPasswordValidator }
  );

  /** Whether a code has been asked for. The backend's answer is always the same sentence, shown translated. */
  readonly requested = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  passwordInputType: 'password' | 'text' = 'password';
  /** The rule checklist stays open while the password is being typed or breaks a rule, so the button stays in view. */
  readonly passwordFocused = signal(false);

  private readonly newPassword = toSignal(this.resetForm.controls.password.valueChanges, { initialValue: '' });

  get passwordRules(): PasswordRule[] {
    return passwordRuleChecklist(this.newPassword(), this.passwordsUtility.minPasswordLength, this.validatePassword);
  }

  get allRulesMet(): boolean {
    return !!this.newPassword() && this.passwordRules.every((rule) => rule.met);
  }

  ngOnInit(): void {
    this.requestForm.setValue({ username: this.username() });
  }

  requestCode(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    const wasRequested = this.requested();
    this.error.set(null);
    this.info.set(null);
    this.loading.set(true);
    this.staffAccess
      .requestPasswordReset(this.requestForm.getRawValue().username.trim())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.requested.set(true);
          if (wasRequested) {
            this.info.set(this.translate.instant('staffAccess.reset.New code requested'));
            this.resetForm.controls.code.reset();
          }
        },
        error: (error: HttpErrorResponse) => this.error.set(staffAccessErrorText(error, this.translate))
      });
  }

  setPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }
    const { code, password, repeatPassword } = this.resetForm.getRawValue();
    this.error.set(null);
    this.info.set(null);
    this.loading.set(true);
    this.staffAccess
      .confirmPasswordReset({
        username: this.requestForm.getRawValue().username.trim(),
        code,
        password,
        repeatPassword
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.alertService.alert({
            type: this.translate.instant('staffAccess.reset.Password changed'),
            message: this.translate.instant('staffAccess.reset.Password changed message')
          });
          this.staffAccess.backToSignIn(this.requestForm.getRawValue().username.trim());
        },
        // A refused password keeps the code usable, so the form stays as it is for another try.
        error: (error: HttpErrorResponse) => this.error.set(staffAccessErrorText(error, this.translate))
      });
  }

  /** Back to the first step, to correct the username. */
  changeUsername(): void {
    this.requested.set(false);
    this.error.set(null);
    this.info.set(null);
    this.resetForm.reset();
  }

  backToSignIn(): void {
    this.staffAccess.backToSignIn();
  }
}
