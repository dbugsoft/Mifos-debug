/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

export interface InputDialogField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'date' | 'select';
  /** For a select: the choices, with their labels to translate */
  options?: { value: string; label: string }[];
  /** A hint under the field, to translate */
  hint?: string;
  required?: boolean;
  maxLength?: number;
  value?: string;
}

export interface InputDialogData {
  title: string;
  message?: string;
  fields: InputDialogField[];
  confirm: string;
  danger?: boolean;
}

/** A short form in a dialog: a reason, an FIU reference and date. Returns the values, or nothing when cancelled. */
@Component({
  selector: 'mifosx-compliance-input-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="ok()">
      <mat-dialog-content>
        @if (data.message) {
          <p class="message">{{ data.message | translate }}</p>
        }
        @for (f of data.fields; track f.name) {
          <mat-form-field class="field">
            <mat-label>{{ f.label | translate }}</mat-label>
            @if (f.type === 'textarea') {
              <textarea matInput rows="4" [formControlName]="f.name" [attr.maxlength]="f.maxLength ?? 1000"></textarea>
            } @else if (f.type === 'select') {
              <mat-select [formControlName]="f.name">
                @for (o of f.options ?? []; track o.value) {
                  <mat-option [value]="o.value">{{ o.label | translate }}</mat-option>
                }
              </mat-select>
            } @else {
              <input
                matInput
                [type]="f.type ?? 'text'"
                [formControlName]="f.name"
                [attr.maxlength]="f.maxLength ?? 200"
              />
            }
            @if (f.hint) {
              <mat-hint>{{ f.hint | translate }}</mat-hint>
            }
          </mat-form-field>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" mat-dialog-close>{{ 'labels.buttons.Cancel' | translate }}</button>
        <button mat-raised-button [color]="data.danger ? 'warn' : 'primary'" type="submit" [disabled]="form.invalid">
          {{ data.confirm | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .field {
        width: 100%;
      }
      .message {
        margin: 0 0 12px;
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputDialogComponent {
  readonly data = inject<InputDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<InputDialogComponent>);
  readonly form: FormGroup;

  constructor() {
    const controls: Record<string, unknown[]> = {};
    this.data.fields.forEach(
      (f) => (controls[f.name] = [
          f.value ?? '',
          f.required ? [
                Validators.required,
                Validators.pattern(/\S/)
              ] : []
        ])
    );
    this.form = inject(FormBuilder).group(controls);
  }

  ok(): void {
    if (this.form.valid) {
      this.ref.close(this.form.getRawValue());
    }
  }
}
