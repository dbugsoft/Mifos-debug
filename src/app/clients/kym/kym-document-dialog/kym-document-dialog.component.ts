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
import { KymService } from '../kym.service';
import { KYM_DOCUMENTS } from '../kym.models';

export interface KymDocumentDialogData {
  clientId: number;
  /** The missing item: thumbprint, byeLaws, boardDecision, … */
  item: string;
  /** What is missing, in words */
  label: string;
}

/**
 * Uploads one of the documents the KYM looks for (thumbprints, an organisation's bye-laws, statements, tax clearance,
 * board decision) as a Fineract client document under its fixed name, so the clerk never types the name. Returns true
 * when uploaded.
 */
@Component({
  selector: 'mifosx-kym-document-dialog',
  template: `
    <h2 mat-dialog-title>{{ 'kym.doc.title' | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <p class="lead">{{ data.label }}</p>
        @if (names.length > 1) {
          <mat-form-field class="full">
            <mat-label>{{ 'kym.doc.Which' | translate }}</mat-label>
            <mat-select formControlName="name">
              @for (n of names; track n) {
                <mat-option [value]="n">{{ 'kym.doc.name.' + n | translate }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        <div class="file">
          <button mat-stroked-button color="primary" type="button" (click)="picker.click()">
            {{ 'kym.doc.Choose a file' | translate }}
          </button>
          <span class="file-name">{{ file()?.name ?? ('kym.doc.noFile' | translate) }}</span>
          <input #picker type="file" hidden accept="image/*,application/pdf" (change)="choose($event)" />
        </div>
        <mat-form-field class="full">
          <mat-label>{{ 'kym.doc.Description' | translate }}</mat-label>
          <input matInput formControlName="description" maxlength="250" />
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-raised-button type="button" mat-dialog-close [disabled]="busy()">
          {{ 'labels.buttons.Cancel' | translate }}
        </button>
        <button mat-raised-button color="primary" type="submit" [disabled]="busy() || form.invalid || !file()">
          {{ 'kym.doc.Upload' | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .lead {
        margin: 0 0 12px;
        color: var(--mat-sys-on-surface-variant);
        font-size: 0.875rem;
      }
      .full {
        width: 100%;
      }
      .file {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 12px;
        margin-bottom: 16px;
      }
      .file-name {
        overflow-wrap: anywhere;
        color: var(--mat-sys-on-surface-variant);
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KymDocumentDialogComponent {
  readonly data = inject<KymDocumentDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<KymDocumentDialogComponent, boolean>);
  private kymService = inject(KymService);

  readonly names = KYM_DOCUMENTS[this.data.item] ?? [];
  readonly busy = signal(false);
  readonly file = signal<File | null>(null);
  readonly form = inject(FormBuilder).group({
    name: [
      this.names[0] ?? null,
      Validators.required
    ],
    description: [
      '',
      Validators.maxLength(250)
    ]
  });

  choose(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  save(): void {
    const f = this.file();
    if (!f || this.form.invalid) {
      return;
    }
    this.busy.set(true);
    this.kymService
      .uploadDocument(this.data.clientId, this.form.value.name, f, this.form.value.description || undefined)
      .subscribe({
        next: () => this.ref.close(true),
        error: () => this.busy.set(false)
      });
  }
}
