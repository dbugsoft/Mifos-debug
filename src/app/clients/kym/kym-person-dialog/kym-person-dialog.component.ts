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
import { KymPerson, KymView, ORGANISATION_ROLES } from '../kym.models';
import { KymMemberPickerComponent } from '../member-picker/member-picker.component';

export interface KymPersonDialogData {
  clientId: number;
  /** The role to start with, when the clerk came from a missing item */
  role?: string;
}

/**
 * Links a person to an organisation member (fineract-dbug #191): a board member, the chief executive or an account
 * operator. The person is a client of this cooperative with their own KYM; they need not be a member.
 */
@Component({
  selector: 'mifosx-kym-person-dialog',
  template: `
    <h2 mat-dialog-title>{{ 'kym.org.Add a person' | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <p class="lead">{{ 'kym.org.personLead' | translate }}</p>
        @if (person(); as p) {
          <div class="picked">
            <span
              ><b>{{ p.name }}</b> · {{ p.accountNo }}</span
            >
            <button mat-button type="button" (click)="person.set(null)">{{ 'kym.Remove' | translate }}</button>
          </div>
        } @else {
          <mifosx-kym-member-picker
            label="kym.org.Find the person"
            [exclude]="data.clientId"
            (picked)="person.set($event)"
          ></mifosx-kym-member-picker>
        }
        <div class="row">
          <mat-form-field>
            <mat-label>{{ 'kym.org.Role' | translate }}</mat-label>
            <mat-select formControlName="role">
              @for (r of roles; track r) {
                <mat-option [value]="r">{{ 'kym.org.role.' + r | translate }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'kym.org.Title' | translate }}</mat-label>
            <input matInput formControlName="title" maxlength="100" />
            <mat-hint>{{ 'kym.org.titleHint' | translate }}</mat-hint>
          </mat-form-field>
        </div>
        <p class="hint">{{ 'kym.org.notFoundHint' | translate }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-raised-button type="button" mat-dialog-close [disabled]="busy()">
          {{ 'labels.buttons.Cancel' | translate }}
        </button>
        <button mat-raised-button color="primary" type="submit" [disabled]="busy() || form.invalid || !person()">
          {{ 'kym.org.Add' | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .lead,
      .hint {
        margin: 0 0 12px;
        color: var(--mat-sys-on-surface-variant);
        font-size: 0.875rem;
      }
      .hint {
        margin: 8px 0 0;
      }
      .picked {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 16px;
        padding: 8px 12px;
        border-radius: 6px;
        background: rgb(16 116 185 / 6%);
      }
      .row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px 16px;
      }
      mat-form-field {
        min-width: 0;
      }
      @media (width <= 600px) {
        .row {
          grid-template-columns: minmax(0, 1fr);
          gap: 0;
        }
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    KymMemberPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KymPersonDialogComponent {
  readonly data = inject<KymPersonDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<KymPersonDialogComponent, KymView>);
  private kymService = inject(KymService);

  readonly roles = ORGANISATION_ROLES;
  readonly busy = signal(false);
  readonly person = signal<KymPerson | null>(null);
  readonly form = inject(FormBuilder).group({
    role: [
      this.data.role ?? null,
      Validators.required
    ],
    title: [
      '',
      Validators.maxLength(100)
    ]
  });

  save(): void {
    const p = this.person();
    if (!p || this.form.invalid) {
      return;
    }
    this.busy.set(true);
    this.kymService
      .linkPerson(this.data.clientId, p.clientId, this.form.value.role, this.form.value.title?.trim() || undefined)
      .subscribe({
        next: (k) => this.ref.close(k),
        error: () => this.busy.set(false)
      });
  }
}
