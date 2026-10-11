/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { MatPrefix } from '@angular/material/form-field';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { StaffAccessService } from '../../../core/authentication/staff-access.service';
import { M3IconComponent } from '../../../shared/m3-ui/m3-icon/m3-icon.component';
import { M3ButtonComponent } from '../../../shared/m3-ui/m3-button/m3-button.component';
import { staffAccessErrorText } from '../staff-access-errors';

/**
 * Shown on the sign-in card when the password was right but the staff member hasn't yet proved that the email
 * address on their account is theirs (fineract-dbug ADR 0019). Once the emailed code is confirmed, it signs in again
 * with the same credentials.
 */
@Component({
  selector: 'mifosx-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['../staff-access-step.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatPrefix,
    MatProgressSpinner,
    M3IconComponent,
    M3ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailComponent {
  private staffAccess = inject(StaffAccessService);
  private authenticationService = inject(AuthenticationService);
  private translate = inject(TranslateService);

  /** The credentials just typed, and the masked address the code goes to. */
  readonly username = input.required<string>();
  readonly password = input.required<string>();
  readonly maskedEmail = input.required<string>();

  readonly codeForm = inject(FormBuilder).nonNullable.group({
    code: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d{6}$/)
      ]
    ]
  });

  readonly sent = signal(false);
  readonly loading = signal(false);
  readonly validMinutes = signal(15);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  sendCode(): void {
    this.error.set(null);
    this.info.set(null);
    this.loading.set(true);
    this.staffAccess
      .sendVerificationCode(this.username(), this.password())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (sent) => {
          this.validMinutes.set(sent.validMinutes);
          if (this.sent()) {
            this.info.set(this.translate.instant('staffAccess.verify.New code sent'));
          }
          this.sent.set(true);
          this.codeForm.reset();
        },
        error: (error: HttpErrorResponse) => this.error.set(staffAccessErrorText(error, this.translate))
      });
  }

  confirm(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.info.set(null);
    this.loading.set(true);
    this.staffAccess
      .confirmVerificationCode(this.username(), this.password(), this.codeForm.getRawValue().code)
      .subscribe({
        next: () => this.signIn(),
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(staffAccessErrorText(error, this.translate));
        }
      });
  }

  backToSignIn(): void {
    this.staffAccess.backToSignIn();
  }

  /** Signs in again now that the address is verified; the sign-in page takes over from its success alert. */
  private signIn(): void {
    this.authenticationService
      .login({ username: this.username(), password: this.password(), remember: false })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.staffAccess.backToSignIn(),
        error: (error: HttpErrorResponse) => this.error.set(staffAccessErrorText(error, this.translate))
      });
  }
}
