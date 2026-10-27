/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { KymMemberPickerComponent } from 'app/clients/kym/member-picker/member-picker.component';
import { KymPerson } from 'app/clients/kym/kym.models';
import { GovernanceRegisterService } from '../../governance-register.service';
import { applyServerErrors } from '../../governance-register.utils';
import { Person } from '../../governance-register.models';

export interface PersonDialogData {
  /** Changing an existing person's contact details, instead of adding a new one. Their member link and name
   * aren't changed here - that's a separate, rarer action with its own rules about when it's refused. */
  person?: Person;
}

/**
 * Adds a person to the governance register (an existing member, or somebody who is not one), or changes an
 * existing person's phone, email, address and note (fineract-dbug #138).
 */
@Component({
  selector: 'mifosx-person-dialog',
  templateUrl: './person-dialog.component.html',
  styleUrls: ['./person-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    KymMemberPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PersonDialogComponent {
  readonly data = inject<PersonDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<PersonDialogComponent, Person>);
  private governance = inject(GovernanceRegisterService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly isMember = signal(true);
  readonly picked = signal<KymPerson | null>(null);
  readonly editing = !!this.data.person;
  /** Set once a submit is tried and rejected locally, so "pick a member"/"type a name" show only once relevant. */
  readonly attempted = signal(false);

  readonly form = inject(FormBuilder).group({
    name: [
      this.data.person?.name ?? '',
      Validators.maxLength(200)
    ],
    phone: [
      this.data.person?.phone ?? '',
      Validators.maxLength(30)
    ],
    email: [
      this.data.person?.email ?? '',
      [
        Validators.email,
        Validators.maxLength(200)
      ]
    ],
    address: [
      this.data.person?.address ?? '',
      Validators.maxLength(500)
    ],
    note: [
      this.data.person?.note ?? '',
      Validators.maxLength(1000)
    ]
  });

  /** True once the staff member has tried to submit without picking a member first. */
  get missingMember(): boolean {
    return this.attempted() && !this.editing && this.isMember() && !this.picked();
  }

  setMember(isMember: boolean): void {
    this.isMember.set(isMember);
    this.attempted.set(false);
  }

  pickMember(m: KymPerson): void {
    this.picked.set(m);
    this.attempted.set(false);
  }

  save(): void {
    // A non-member's name is only required in that mode - re-set rather than add, so switching modes after a
    // failed attempt doesn't leave a stale "required" error on a field that no longer needs it.
    this.form.controls.name.setValidators(
      !this.editing && !this.isMember() ? [
            Validators.required,
            Validators.maxLength(200)
          ] : Validators.maxLength(200)
    );
    this.form.controls.name.updateValueAndValidity();

    const member = this.isMember() ? this.picked() : null;
    if ((!this.editing && this.isMember() && !member) || this.form.invalid) {
      this.attempted.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);

    if (this.editing) {
      this.governance
        .updatePerson(this.data.person!.id, {
          phone: v.phone?.trim() || null,
          email: v.email?.trim() || null,
          address: v.address?.trim() || null,
          note: v.note?.trim() || null
        })
        .subscribe({
          next: (p) => this.ref.close(p),
          error: (e) => {
            this.busy.set(false);
            this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
          }
        });
      return;
    }

    const body: Record<string, unknown> = {
      phone: v.phone?.trim() || null,
      email: v.email?.trim() || null,
      address: v.address?.trim() || null,
      note: v.note?.trim() || null
    };
    if (member) {
      body['clientId'] = member.clientId;
    } else {
      body['name'] = v.name?.trim();
    }
    this.governance.createPerson(body).subscribe({
      next: (p) => this.ref.close(p),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
      }
    });
  }
}
