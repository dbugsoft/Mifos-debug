/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, OnInit, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

/** Custom Services */
import { UsersService } from '../users.service';
import { StaffLoginService, emailAvailableValidator } from '../staff-login.service';
import { MatCheckbox } from '@angular/material/checkbox';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Edit User Component.
 */
@Component({
  selector: 'mifosx-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCheckbox
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditUserComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private usersService = inject(UsersService);
  private staffLogins = inject(StaffLoginService);
  /** Whether this user must verify their email before signing in (fineract-dbug ADR 0019). */
  private verificationRequired = signal(false);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  /** User Data */
  userData: any;
  /** Offices Data */
  officesData: any;
  /** Staff Data */
  staffData: any;
  /** Roles Data */
  rolesData: any;
  /** Edit User form. */
  editUserForm: FormGroup;

  /**
   * Retrieves the offices data from `resolve`.
   * @param {FormBuilder} formBuilder Form Builder.
   * @param {UsersService} UsersService Users Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   */
  constructor() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data: { user: any; usersTemplate: any }) => {
      this.userData = data.user;
      this.officesData = data.usersTemplate.allowedOffices;
      this.rolesData = data.usersTemplate.availableRoles;
    });
  }

  ngOnInit() {
    this.createEditUserForm();
    this.editUserForm.controls.email.addAsyncValidators(
      emailAvailableValidator(this.staffLogins, () => this.userData.id)
    );
    if (this.staffLogins.canRead()) {
      this.staffLogins
        .status(this.userData.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((status) => this.verificationRequired.set(status.emailVerificationRequired));
    }
    this.officeChanged(this.userData.officeId);
  }

  /** A changed email has to be verified again by its owner before they can sign in. */
  get emailChangeNeedsVerification(): boolean {
    const typed = (this.editUserForm.controls.email.value ?? '').trim().toLowerCase();
    const saved = (this.userData.email ?? '').trim().toLowerCase();
    return this.verificationRequired() && !!typed && typed !== saved;
  }

  /**
   * Creates the edit user form.
   */
  createEditUserForm() {
    const staffId = this.userData.staff ? this.userData.staff.id : null;
    this.editUserForm = this.formBuilder.group({
      username: [
        this.userData.username,
        Validators.required
      ],
      email: [
        this.userData.email,
        [
          Validators.required,
          Validators.email
        ]
      ],
      firstname: [
        this.userData.firstname,
        [
          Validators.required,
          Validators.pattern('(^[A-z]).*')
        ]
      ],
      lastname: [
        this.userData.lastname,
        [
          Validators.required,
          Validators.pattern('(^[A-z]).*')
        ]
      ],
      passwordNeverExpires: [this.userData.passwordNeverExpires],
      officeId: [
        this.userData.officeId,
        Validators.required
      ],
      staffId: [staffId],
      roles: [
        this.userData.selectedRoles.map((role: any) => role.id),
        Validators.required
      ]
    });
  }

  /**
   * Fetches the staff for the selected office
   * @param officeId the selected office id
   */
  officeChanged(officeId: number) {
    this.staffData = [];
    this.usersService.getStaff(officeId).subscribe((staff: any) => {
      this.staffData = staff;
    });
  }

  /**
   * Submits the user form and edits the user,
   * if successful redirects to the updated user.
   */
  submit() {
    const editedUser = this.editUserForm.value;
    this.usersService.editUser(this.userData.id, editedUser).subscribe((response: any) => {
      this.router.navigate(
        [
          '../../',
          response.resourceId
        ],
        { relativeTo: this.route }
      );
    });
  }
}
