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
import { PersonDocument } from '../../governance-register.models';

export interface DocumentDialogData {
  personId: number;
}

/** Adds a document to a person's file (fineract-dbug #138): a PDF or image, within the server's upload limit. */
@Component({
  selector: 'mifosx-document-dialog',
  templateUrl: './document-dialog.component.html',
  styleUrls: ['./document-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentDialogComponent {
  readonly data = inject<DocumentDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<DocumentDialogComponent, PersonDocument>);
  private governance = inject(GovernanceRegisterService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly file = signal<File | null>(null);

  readonly form = inject(FormBuilder).group({
    title: [
      '',
      [
        Validators.required,
        Validators.maxLength(200)
      ]
    ],
    note: [
      '',
      Validators.maxLength(1000)
    ]
  });

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  save(): void {
    const f = this.file();
    if (this.form.invalid || !f) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    this.governance.uploadDocument(this.data.personId, v.title!.trim(), v.note?.trim() || null, f).subscribe({
      next: (d) => this.ref.close(d),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
      }
    });
  }
}
