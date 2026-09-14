/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface TenantAccessConfirmDialogData {
  title: string;
  intro?: string;
  /** What will happen, one consequence per line. */
  points: string[];
  confirmLabel: string;
  /** Styles the confirm button as a destructive action. */
  destructive?: boolean;
  /** Require a written reason (recorded in the audit log). */
  reason?: { label: string; minLength: number };
  /** Require the admin to type this exact text before confirming. */
  typeToConfirm?: string;
}

export interface TenantAccessConfirmDialogResult {
  reason?: string;
}

/**
 * Confirmation for tenant access actions that change who can sign in:
 * activation, access reset, and legacy remediation. Closing it any way
 * other than the confirm button returns undefined.
 */
@Component({
  selector: 'mifosx-tenant-access-confirm-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './tenant-access-confirm-dialog.component.html',
  styleUrl: './tenant-access-confirm-dialog.component.scss'
})
export class TenantAccessConfirmDialogComponent {
  readonly data = inject<TenantAccessConfirmDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject<MatDialogRef<TenantAccessConfirmDialogComponent, TenantAccessConfirmDialogResult>>(MatDialogRef);

  readonly form = new FormGroup({
    reason: new FormControl('', {
      nonNullable: true,
      validators: this.data.reason ? [minTrimmedLength(this.data.reason.minLength)] : []
    }),
    confirmation: new FormControl('', {
      nonNullable: true,
      validators: this.data.typeToConfirm ? [matches(this.data.typeToConfirm)] : []
    })
  });

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const reason = this.form.controls.reason.value.trim();

    this.dialogRef.close(reason ? { reason } : {});
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}

function minTrimmedLength(min: number) {
  return (control: AbstractControl): ValidationErrors | null =>
    ((control.value as string) ?? '').trim().length >= min ? null : { minTrimmedLength: { min } };
}

function matches(expected: string) {
  return (control: AbstractControl): ValidationErrors | null =>
    ((control.value as string) ?? '').trim() === expected ? null : { mismatch: true };
}
