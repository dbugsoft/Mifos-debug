/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at [http://mozilla.org/MPL/2.0/](http://mozilla.org/MPL/2.0/).
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
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
    <div class="dialog-shell" [class.dialog-danger]="data.danger">
      <h2 mat-dialog-title>
        <span class="icon-badge" [class.danger]="data.danger">
          <mat-icon>{{ data.danger ? 'warning_amber' : 'task_alt' }}</mat-icon>
        </span>

        <span class="dialog-title-text">
          {{ data.title | translate }}
        </span>
      </h2>

      <form [formGroup]="form" (ngSubmit)="ok()">
        <mat-dialog-content>
          @if (data.message) {
            <p class="message">
              <mat-icon>info_outline</mat-icon>
              <span>{{ data.message | translate }}</span>
            </p>
          }

          <div class="fields-container">
            @for (f of data.fields; track f.name) {
              <mat-form-field appearance="outline" class="field">
                <mat-label>{{ f.label | translate }}</mat-label>

                @if (f.type === 'textarea') {
                  <textarea
                    matInput
                    rows="4"
                    [formControlName]="f.name"
                    [attr.maxlength]="f.maxLength ?? 1000"
                  ></textarea>
                } @else if (f.type === 'select') {
                  <mat-select [formControlName]="f.name">
                    @for (o of f.options ?? []; track o.value) {
                      <mat-option [value]="o.value">
                        {{ o.label | translate }}
                      </mat-option>
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
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-stroked-button type="button" mat-dialog-close class="cancel-button">
            {{ 'labels.buttons.Cancel' | translate }}
          </button>

          <button
            mat-raised-button
            [color]="data.danger ? 'warn' : 'primary'"
            type="submit"
            class="confirm-button"
            [disabled]="form.invalid"
          >
            {{ data.confirm | translate }}
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        color: var(--dk-text, #172b4d);
      }

      .dialog-shell {
        --dialog-primary: var(--md-sys-color-primary, var(--dk-primary, #155eef));
        --dialog-border: var(--dk-border, #e2e8f0);
        --dialog-surface: var(--dk-surface, #ffffff);
        --dialog-soft: var(--dk-surface-2, #f8fafc);
        background: var(--dialog-surface);
      }

      /* Dialog header */

      [mat-dialog-title] {
        display: flex;
        align-items: center;
        gap: 14px;
        margin: 0;
        padding: 24px 24px 20px;
        border-bottom: 1px solid var(--dialog-border);
        font-size: 20px;
        font-weight: 700;
        line-height: 1.4;
        letter-spacing: -0.3px;
      }

      .dialog-title-text {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .icon-badge {
        display: flex;
        flex: 0 0 44px;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 13px;
        background: var(--dk-primary-soft, #e8f1ff);
        color: var(--dialog-primary);
      }

      .icon-badge mat-icon {
        width: 23px;
        height: 23px;
        font-size: 23px;
      }

      .icon-badge.danger {
        background: var(--dk-danger-soft, #ffebee);
        color: var(--dk-danger, #c62828);
      }

      /* Dialog content */

      mat-dialog-content {
        max-height: 65vh;
        padding: 24px;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
      }

      mat-dialog-content::-webkit-scrollbar {
        width: 5px;
      }

      mat-dialog-content::-webkit-scrollbar-thumb {
        border-radius: 10px;
        background: #cbd5e1;
      }

      /* Message */

      .message {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin: 0 0 22px;
        padding: 13px 15px;
        border: 1px solid #dbeafe;
        border-radius: 10px;
        background: #eff6ff;
        color: #1e40af;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.6;
      }

      .message mat-icon {
        flex: none;
        width: 19px;
        height: 19px;
        font-size: 19px;
      }

      /* Dynamic form fields */

      .fields-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .field {
        width: 100%;
      }

      .field textarea {
        min-height: 100px;
        line-height: 1.6;
        resize: vertical;
      }

      .field ::ng-deep .mat-mdc-text-field-wrapper {
        border-radius: 10px;
      }

      .field ::ng-deep .mat-mdc-form-field-infix {
        min-height: 52px;
      }

      .field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        min-height: 22px;
      }

      /* Dialog footer */

      mat-dialog-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        min-height: 76px;
        margin: 0;
        padding: 16px 24px;
        border-top: 1px solid var(--dialog-border);
        background: var(--dialog-soft);
      }

      mat-dialog-actions button {
        min-width: 115px;
        min-height: 42px;
        border-radius: 9px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0;
      }

      .cancel-button {
        border-color: #cbd5e1;
        color: #475569;
        background: #ffffff;
      }

      .cancel-button:hover {
        background: #f1f5f9;
      }

      .confirm-button {
        box-shadow: none;
      }

      .confirm-button mat-icon {
        width: 18px;
        height: 18px;
        margin-left: 6px;
        font-size: 18px;
        vertical-align: middle;
      }

      .confirm-button:disabled {
        opacity: 0.55;
      }

      /* Danger state */

      .dialog-danger .message {
        border-color: #fecaca;
        background: #fef2f2;
        color: #991b1b;
      }

      /* Responsive */

      @media (max-width: 600px) {
        [mat-dialog-title] {
          gap: 11px;
          padding: 18px 18px 16px;
          font-size: 18px;
        }

        .icon-badge {
          flex-basis: 40px;
          width: 40px;
          height: 40px;
          border-radius: 11px;
        }

        mat-dialog-content {
          padding: 18px;
        }

        mat-dialog-actions {
          gap: 8px;
          padding: 14px 18px;
        }

        mat-dialog-actions button {
          flex: 1;
          min-width: 0;
        }
      }

      @media (prefers-reduced-motion: no-preference) {
        .cancel-button,
        .confirm-button {
          transition:
            background-color 160ms ease,
            box-shadow 160ms ease;
        }
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon
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
