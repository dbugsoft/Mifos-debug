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
import { Term, TERM_END_REASONS } from '../../governance-register.models';

export interface EndTermDialogData {
  term: Term;
}

/** Ends a term on a committee (fineract-dbug #138): the day it ended and why. */
@Component({
  selector: 'mifosx-end-term-dialog',
  templateUrl: './end-term-dialog.component.html',
  styleUrls: ['./end-term-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EndTermDialogComponent {
  readonly data = inject<EndTermDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<EndTermDialogComponent, Term>);
  private governance = inject(GovernanceRegisterService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly today = new Date();
  readonly reasons = TERM_END_REASONS;

  readonly form = inject(FormBuilder).group({
    endedOn: [
      this.today,
      Validators.required
    ],
    reason: [
      null as string | null,
      Validators.required
    ],
    note: [
      '',
      Validators.maxLength(1000)
    ]
  });

  get needsNote(): boolean {
    return this.form.controls.reason.value === 'OTHER';
  }

  save(): void {
    // Re-set rather than add: a validator added on an earlier attempt must not linger once the reason that
    // needed it is no longer selected.
    this.form.controls.note.setValidators(
      this.needsNote ? [
            Validators.required,
            Validators.maxLength(1000)
          ] : Validators.maxLength(1000)
    );
    this.form.controls.note.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    this.governance
      .endTerm(this.data.term.id, {
        endedOn: isoDate(v.endedOn),
        reason: v.reason,
        note: v.note?.trim() || null
      })
      .subscribe({
        next: (t) => this.ref.close(t),
        error: (e) => {
          this.busy.set(false);
          this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
        }
      });
  }
}
