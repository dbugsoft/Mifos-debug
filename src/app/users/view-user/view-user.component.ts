/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

/** Custom Services */
import { UsersService } from '../users.service';
import { LoginStatus, StaffLoginService } from '../staff-login.service';
import { AlertService } from 'app/core/alert/alert.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';

/** Custom Components */
import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { ChangePasswordDialogComponent } from 'app/shared/change-password-dialog/change-password-dialog.component';
import { ConfirmationDialogComponent } from 'app/shared/confirmation-dialog/confirmation-dialog.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * View user component.
 */
@Component({
  selector: 'mifosx-view-user',
  templateUrl: './view-user.component.html',
  styleUrls: ['./view-user.component.scss'],
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewUserComponent {
  private usersService = inject(UsersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private staffLogins = inject(StaffLoginService);
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);
  private authenticationService = inject(AuthenticationService);

  /** User Data. */
  userData: any;
  /** Sign-in state (fineract-dbug ADR 0019), for administrators allowed to see it. */
  loginStatus = signal<LoginStatus | null>(null);
  canUnlock = this.staffLogins.canUnlock();
  canSendCode = this.staffLogins.canSendCode();

  /**
   * Retrieves the user data from `resolve`.
   * @param {UsersService} usersService Users Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   * @param {MatDialog} dialog Dialog reference.
   */
  constructor() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data: { user: any }) => {
      this.userData = data.user;
      this.loadLoginStatus();
    });
  }

  /** Unlocks an account locked by too many wrong passwords, after a confirmation. */
  unlock() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        heading: this.translate.instant('staffAccess.users.Unlock account'),
        dialogContext: this.translate.instant('staffAccess.users.Unlock question', {
          username: this.userData.username
        })
      }
    });
    dialogRef.afterClosed().subscribe((response: any) => {
      if (response?.confirm) {
        this.staffLogins.unlock(this.userData.id).subscribe(() => {
          this.alertService.alert({
            type: this.translate.instant('staffAccess.users.Unlock account'),
            message: this.translate.instant('staffAccess.users.Unlocked', { username: this.userData.username })
          });
          this.loadLoginStatus();
        });
      }
    });
  }

  /** Emails a verification code to the address on the account, for a staff member who asks for help. */
  sendVerificationCode() {
    this.staffLogins.sendVerificationCode(this.userData.id).subscribe((sent) => {
      this.alertService.alert({
        type: this.translate.instant('staffAccess.users.Send verification code'),
        message: this.translate.instant('staffAccess.users.Code sent', { email: sent.maskedEmail })
      });
    });
  }

  private loadLoginStatus() {
    this.loginStatus.set(null);
    if (!this.staffLogins.canRead()) {
      return;
    }
    this.staffLogins
      .status(this.userData.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => this.loginStatus.set(status));
  }

  /**
   * Deletes the user and redirects to users.
   */
  delete() {
    const deleteUserDialogRef = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `user ${this.userData.id}` }
    });
    deleteUserDialogRef.afterClosed().subscribe((response: any) => {
      if (response.delete) {
        this.usersService.deleteUser(this.userData.id).subscribe(() => {
          this.router.navigate(['/appusers']);
        });
      }
    });
  }

  /**
   * Change Password of the Users.
   */
  changeUserPassword() {
    const changeUserPasswordDialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      width: '440px'
    });
    changeUserPasswordDialogRef.afterClosed().subscribe((response: any) => {
      if (response.password && response.repeatPassword) {
        const password = response.password;
        const repeatPassword = response.repeatPassword;
        const firstname = this.userData.firstname;
        const data = { password: password, repeatPassword: repeatPassword, firstname: firstname };
        this.authenticationService.changePassword(this.userData.id, data).subscribe(() => {
          this.router.navigate(['/appusers']);
        });
      }
    });
  }
}
