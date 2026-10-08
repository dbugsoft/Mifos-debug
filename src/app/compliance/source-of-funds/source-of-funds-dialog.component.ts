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
import { MatRadioModule } from '@angular/material/radio';
import { HttpClient } from '@angular/common/http';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

export interface SourceOfFundsDialogData {
  product: 'SAVINGS' | 'LOAN' | 'SHARE';
  accountId?: number | null;
  clientId?: number | null;
  amount: number;
  line: number;
  sources: { id: number; name: string }[];
}

/**
 * "Where does this money come from?" (fineract-dbug #132, #137; mockup artboard 7): asked at the counter before a
 * deposit, loan repayment or share purchase of the line or more. Saving records the declaration; the posting then
 * goes ahead. Closing without saving cancels the posting.
 */
@Component({
  selector: 'mifosx-source-of-funds-dialog',
  template: `
    <h2 mat-dialog-title>{{ 'compliance.sof.Where does this money come from?' | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="content">
        <p class="message">
          {{ 'compliance.sof.Explanation' | translate: { line: (data.line | formatNumber) } }}
        </p>
        <p class="amount">
          {{ 'compliance.Amount' | translate }}: <strong>{{ data.amount | formatNumber }}</strong>
        </p>
        <mat-form-field class="field">
          <mat-label>{{ 'compliance.sof.Source of the money' | translate }}</mat-label>
          <mat-select formControlName="sourceId" required>
            @for (s of data.sources; track s.id) {
              <mat-option [value]="s.id">{{ s.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field class="field">
          <mat-label>{{ 'compliance.sof.Details' | translate }}</mat-label>
          <textarea matInput rows="3" formControlName="details" maxlength="500"></textarea>
        </mat-form-field>
        <mat-radio-group
          formControlName="broughtBy"
          class="radios"
          [attr.aria-label]="'compliance.sof.Who brought the money' | translate"
        >
          <mat-radio-button value="MEMBER">{{ 'compliance.sof.The member' | translate }}</mat-radio-button>
          <mat-radio-button value="OTHER">{{ 'compliance.sof.Someone else' | translate }}</mat-radio-button>
        </mat-radio-group>
        @if (form.value.broughtBy === 'OTHER') {
          <div class="two">
            <mat-form-field>
              <mat-label>{{ 'compliance.sof.Their name' | translate }}</mat-label>
              <input matInput formControlName="otherName" maxlength="200" required />
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'compliance.sof.Relationship to the member' | translate }}</mat-label>
              <input matInput formControlName="otherRelationship" maxlength="100" required />
            </mat-form-field>
          </div>
        }
        @if (failed()) {
          <p class="error" role="alert">{{ 'compliance.sof.Could not save' | translate }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" [mat-dialog-close]="false">
          {{ 'labels.buttons.Back' | translate }}
        </button>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
          {{ 'compliance.sof.Save and post' | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .field {
        width: 100%;
      }
      .message,
      .amount {
        margin: 0;
      }
      .radios {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 8px;
      }
      .two {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0 12px;
      }
      .error {
        margin: 0;
        color: var(--mat-sys-error, #b3261e);
      }
      @media (width <= 600px) {
        .two {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatRadioModule,
    FormatNumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SourceOfFundsDialogComponent {
  readonly data = inject<SourceOfFundsDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<SourceOfFundsDialogComponent>);
  private http = inject(HttpClient);
  readonly saving = signal(false);
  readonly failed = signal(false);

  readonly form = inject(FormBuilder).group({
    sourceId: [
      null as number | null,
      Validators.required
    ],
    details: [''],
    broughtBy: [
      'MEMBER',
      Validators.required
    ],
    otherName: [''],
    otherRelationship: ['']
  });

  save(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid || (v.broughtBy === 'OTHER' && (!v.otherName?.trim() || !v.otherRelationship?.trim()))) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    this.http
      .post('/nepal/aml/source-of-funds', {
        product: this.data.product,
        accountId: this.data.accountId ?? null,
        clientId: this.data.clientId ?? null,
        amount: this.data.amount,
        sourceId: v.sourceId,
        details: v.details?.trim() || null,
        broughtBy: v.broughtBy,
        otherName: v.broughtBy === 'OTHER' ? v.otherName.trim() : null,
        otherRelationship: v.broughtBy === 'OTHER' ? v.otherRelationship.trim() : null
      })
      .subscribe({
        next: () => this.ref.close(true),
        error: () => {
          this.saving.set(false);
          this.failed.set(true);
        }
      });
  }
}
