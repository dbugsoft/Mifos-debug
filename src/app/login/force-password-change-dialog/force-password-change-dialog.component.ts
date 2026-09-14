/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthenticationService } from '../../core/authentication/authentication.service';
import { ResetPasswordComponent } from '../reset-password/reset-password.component';

/**
 * Blocking "set a new password" dialog, opened from WebAppComponent whenever PasswordRenewalService says a change is
 * required: a cooperative administrator's first sign-in, an admin reset, or an expired password.
 *
 * It reuses ResetPasswordComponent (form, validators, live rule checklist, POST /users/{id}/pwd and re-sign-in).
 * The dialog closes itself when the re-sign-in clears the requirement; the only other way out is signing out.
 * Opened with FORCE_PASSWORD_CHANGE_DIALOG_CONFIG, so Escape, backdrop clicks and navigation cannot close it.
 */
@Component({
  selector: 'mifosx-force-password-change-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    TranslatePipe,
    ResetPasswordComponent
  ],
  templateUrl: './force-password-change-dialog.component.html',
  styleUrl: './force-password-change-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForcePasswordChangeDialogComponent {
  private authenticationService = inject(AuthenticationService);
  private dialogRef = inject<MatDialogRef<ForcePasswordChangeDialogComponent>>(MatDialogRef);
  private router = inject(Router);

  /** Shown so that on a shared computer it is obvious whose password is being set. */
  readonly username = this.authenticationService.pendingPasswordRenewalUsername;

  signOut(): void {
    this.authenticationService.logout().subscribe(() => {
      this.dialogRef.close();
      this.router.navigate(['/login'], { replaceUrl: true });
    });
  }
}
