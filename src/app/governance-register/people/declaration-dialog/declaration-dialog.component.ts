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
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { GovernanceRegisterService } from '../../governance-register.service';
import { applyServerErrors, isoDate } from '../../governance-register.utils';
import { DECLARATION_KINDS, Declaration } from '../../governance-register.models';

export interface DeclarationDialogData {
  personId: number;
}

/**
 * Records a declaration (property, or conflict of interest) for a person in the register (fineract-dbug #138).
 * One property declaration a person a fiscal year, made after the year has ended.
 */
@Component({
  selector: 'mifosx-declaration-dialog',
  templateUrl: './declaration-dialog.component.html',
  styleUrls: ['./declaration-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeclarationDialogComponent {
  readonly data = inject<DeclarationDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<DeclarationDialogComponent, Declaration>);
  private governance = inject(GovernanceRegisterService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly file = signal<File | null>(null);
  readonly today = new Date();
  readonly kinds = DECLARATION_KINDS;

  readonly form = inject(FormBuilder).group({
    kind: [
      'PROPERTY',
      Validators.required
    ],
    declaredOn: [
      this.today,
      Validators.required
    ],
    fiscalYear: [null as number | null],
    subject: [
      '',
      Validators.maxLength(200)
    ],
    decisionReference: [
      '',
      Validators.maxLength(200)
    ],
    detail: [
      '',
      Validators.maxLength(1000)
    ]
  });

  get isProperty(): boolean {
    return this.form.controls.kind.value === 'PROPERTY';
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  save(): void {
    const f = this.file();
    // Re-set rather than add: a validator added on an earlier attempt must not linger once the kind
    // that needed it is no longer selected. Each field's own base validator comes along too.
    this.form.controls.fiscalYear.setValidators(this.isProperty ? Validators.required : null);
    this.form.controls.subject.setValidators(
      this.isProperty ? Validators.maxLength(200) : [
            Validators.required,
            Validators.maxLength(200)
          ]
    );
    this.form.controls.fiscalYear.updateValueAndValidity();
    this.form.controls.subject.updateValueAndValidity();
    if (this.form.invalid || !f) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    this.governance
      .addDeclaration(
        this.data.personId,
        {
          kind: v.kind!,
          declaredOn: isoDate(v.declaredOn) ?? '',
          fiscalYear: this.isProperty ? String(v.fiscalYear) : '',
          subject: this.isProperty ? '' : v.subject?.trim() || '',
          decisionReference: this.isProperty ? '' : v.decisionReference?.trim() || '',
          detail: v.detail?.trim() || ''
        },
        f
      )
      .subscribe({
        next: (d) => this.ref.close(d),
        error: (e) => {
          this.busy.set(false);
          this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
        }
      });
  }
}
