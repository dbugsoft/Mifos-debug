/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { SUSPICIONS } from '../cases.service';

/** What the officer suspects (fineract-dbug ADR-0065). */
export type Basis = 'MONEY_MOVED' | 'ATTEMPTED' | 'CONDUCT';

export const BASES: Basis[] = [
  'MONEY_MOVED',
  'ATTEMPTED',
  'CONDUCT'
];

/** The report that follows from what is suspected, as FIU-Nepal's guideline draws the line (the backend checks it too). */
export function reportTypeFor(basis: Basis | null | undefined): 'STR' | 'SAR' | null {
  if (basis === 'MONEY_MOVED') {
    return 'STR';
  }
  return basis === 'ATTEMPTED' || basis === 'CONDUCT' ? 'SAR' : null;
}

export interface DecideDialogData {
  /** The case's alerts hold transactions: an STR has something to list. */
  hasTransactions: boolean;
}

export interface DecideResult {
  decision: 'REPORT' | 'NO_REPORT';
  basis: Basis | null;
  reportType: 'STR' | 'SAR' | null;
  suspicion: string | null;
  reason: string;
}

/**
 * Deciding a case by answering what the officer can answer (fineract-dbug ADR-0065): is anything suspected, and what.
 * The dialog then names the report and says why, so nobody has to remember the difference between an STR and a SAR.
 */
@Component({
  selector: 'mifosx-decide-dialog',
  templateUrl: './decide-dialog.component.html',
  styleUrls: ['./decide-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatRadioModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DecideDialogComponent {
  private ref = inject(MatDialogRef<DecideDialogComponent, DecideResult>);
  readonly data = inject<DecideDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  readonly bases = BASES;
  readonly suspicions = SUSPICIONS;
  readonly form = this.fb.group({
    decision: this.fb.control<'REPORT' | 'NO_REPORT' | null>(null, Validators.required),
    basis: this.fb.control<Basis | null>(null),
    suspicion: this.fb.control<string | null>(null),
    reason: this.fb.control('', [
      Validators.required,
      Validators.maxLength(4000)
    ])
  });
  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  report(): boolean {
    return this.value().decision === 'REPORT';
  }

  type(): 'STR' | 'SAR' | null {
    return reportTypeFor(this.value().basis);
  }

  ready(): boolean {
    const v = this.value();
    return this.form.valid && (v.decision === 'NO_REPORT' || (!!v.basis && !!v.suspicion));
  }

  decide(): void {
    if (!this.ready()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const report = v.decision === 'REPORT';
    this.ref.close({
      decision: v.decision!,
      basis: report ? v.basis : null,
      reportType: report ? reportTypeFor(v.basis) : null,
      suspicion: report ? v.suspicion : null,
      reason: v.reason!.trim()
    });
  }
}
