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
import { Position } from '../../governance-register.models';

export interface PositionDialogData {
  /** Changing a position already in the register */
  position?: Position;
}

/**
 * Adds a position of the cooperative's own, or changes an existing one (docs/governance-register.md: `POST/PUT
 * positions`). `singleHolder` and `memberRequired` are set once, at creation; only `active` (any position) and
 * `name` (one the cooperative added) can change afterwards.
 */
@Component({
  selector: 'mifosx-position-dialog',
  templateUrl: './position-dialog.component.html',
  styleUrls: ['./position-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PositionDialogComponent {
  readonly data = inject<PositionDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<PositionDialogComponent, Position>);
  private governance = inject(GovernanceRegisterService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly editing = !!this.data.position;
  readonly isOwn = !this.data.position?.builtIn;

  readonly form = inject(FormBuilder).group({
    name: [
      this.data.position?.name ?? '',
      [
        Validators.required,
        Validators.maxLength(150)
      ]
    ],
    singleHolder: [this.data.position?.singleHolder ?? false],
    memberRequired: [this.data.position?.memberRequired ?? true],
    active: [this.data.position?.active ?? true]
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
      ? this.governance.updatePosition(this.data.position!.id, {
          ...(this.isOwn ? { name: v.name } : {}),
          active: v.active
        })
      : this.governance.createPosition({
          name: v.name,
          singleHolder: v.singleHolder,
          memberRequired: v.memberRequired
        });

    call.subscribe({
      next: (p) => this.ref.close(p),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
      }
    });
  }
}
