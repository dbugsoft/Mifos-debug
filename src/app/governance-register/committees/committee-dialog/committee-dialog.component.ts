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
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { GovernanceRegisterService } from '../../governance-register.service';
import { applyServerErrors } from '../../governance-register.utils';
import { Committee } from '../../governance-register.models';

export interface CommitteeDialogData {
  /** Changing a committee already in the register */
  committee?: Committee;
}

/** Committees the board never switches off, even though people-serving blocks it on the server too. */
const NEVER_INACTIVE = [
  'BOARD',
  'ACCOUNTS_SUPERVISION'
];

/** Adds a committee of the cooperative's own, or changes an existing one (fineract-dbug #138). */
@Component({
  selector: 'mifosx-committee-dialog',
  templateUrl: './committee-dialog.component.html',
  styleUrls: ['./committee-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommitteeDialogComponent {
  readonly data = inject<CommitteeDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<CommitteeDialogComponent, Committee>);
  private governance = inject(GovernanceRegisterService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly editing = !!this.data.committee;
  readonly isOwn = !this.data.committee?.builtIn;
  readonly canSwitchOff = !this.data.committee || !NEVER_INACTIVE.includes(this.data.committee.code);

  readonly form = inject(FormBuilder).group({
    name: [
      this.data.committee?.name ?? '',
      [
        Validators.required,
        Validators.maxLength(200)
      ]
    ],
    kind: [this.data.committee?.kind ?? 'SUB_COMMITTEE'],
    // Live data shows some built-in committees (the sub-committees, the election committee) carry no
    // termYears at all - they aren't elected for a fixed term. Editing one must show that honestly
    // (blank, not a made-up "4") instead of implying a term length that was never actually set.
    termYears: [
      this.editing ? (this.data.committee?.termYears ?? null) : 4,
      this.editing ? [
            Validators.min(1),
            Validators.max(20)
          ] : [
            Validators.required,
            Validators.min(1),
            Validators.max(20)
          ]
    ],
    memberRequired: [this.data.committee?.memberRequired ?? true],
    declaresProperty: [this.data.committee?.declaresProperty ?? false],
    active: [this.data.committee?.active ?? true]
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);

    const call = this.editing
      ? this.governance.updateCommittee(this.data.committee!.id, {
          ...(this.isOwn ? { name: v.name, memberRequired: v.memberRequired } : {}),
          termYears: v.termYears,
          declaresProperty: v.declaresProperty,
          active: v.active
        })
      : this.governance.createCommittee({
          name: v.name,
          kind: v.kind,
          termYears: v.termYears,
          memberRequired: v.memberRequired,
          declaresProperty: v.declaresProperty
        });

    call.subscribe({
      next: (c) => this.ref.close(c),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
      }
    });
  }
}
