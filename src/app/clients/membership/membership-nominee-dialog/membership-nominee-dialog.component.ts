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
import { RelationshipSelectComponent } from 'app/shared/relationship-select/relationship-select.component';
import { MembershipService } from '../membership.service';
import { MemberNominee } from '../membership.models';

/**
 * Gives or changes a person's nominee (fineract-dbug ADR-0047): the same fields as the nominee on the membership step,
 * filled with the nominee as it is now, and an optional note. A relationship typed before the list is shown above the
 * empty dropdown; left unchosen, it is sent back unchanged so only the name or phone is corrected.
 */
@Component({
  selector: 'mifosx-membership-nominee-dialog',
  template: `
    <h2 mat-dialog-title>
      {{ (data.nominee ? 'membership.Change nominee' : 'membership.Add nominee') | translate }} · {{ data.name }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <div class="row">
          <mat-form-field>
            <mat-label>{{ 'membership.Nominee name' | translate }}</mat-label>
            <input matInput formControlName="name" maxlength="200" required />
            @if (form.controls.name.hasError('required')) {
              <mat-error>{{ 'membership.errors.nomineeName' | translate }}</mat-error>
            } @else if (form.controls.name.hasError('server')) {
              <mat-error>{{ form.controls.name.getError('server') }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'membership.Nominee phone' | translate }}</mat-label>
            <input matInput formControlName="mobileNo" maxlength="50" />
          </mat-form-field>
          <mifosx-relationship-select
            label="membership.Relationship"
            [code]="form.controls.relationshipCode"
            [detail]="form.controls.relationshipDetail"
            [required]="!typed"
            [typed]="typed"
            [list$]="relationships$"
          ></mifosx-relationship-select>
        </div>
        <mat-form-field class="full">
          <mat-label>{{ 'membership.Note' | translate }}</mat-label>
          <textarea matInput formControlName="note" rows="2" maxlength="500"></textarea>
          <mat-hint>{{ 'membership.nomineeNoteHint' | translate }}</mat-hint>
          @if (form.controls.note.hasError('server')) {
            <mat-error>{{ form.controls.note.getError('server') }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-raised-button type="button" mat-dialog-close [disabled]="busy()">
          {{ 'labels.buttons.Cancel' | translate }}
        </button>
        <button mat-raised-button color="primary" type="submit" [disabled]="busy()">
          {{ 'labels.buttons.Save Changes' | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0 16px;
      }
      .full {
        width: 100%;
      }
      @media (width <= 600px) {
        .row {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    RelationshipSelectComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipNomineeDialogComponent {
  readonly data = inject<MemberNominee>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<MembershipNomineeDialogComponent, MemberNominee>);
  private membershipService = inject(MembershipService);

  readonly relationships$ = this.membershipService.nomineeRelationships();
  /** The relationship as typed before the list, when the nominee has no code */
  readonly typed = this.data.nominee && !this.data.nominee.relationshipCode ? this.data.nominee.relationship : null;
  readonly busy = signal(false);

  readonly form = inject(FormBuilder).group({
    name: [
      this.data.nominee?.name ?? '',
      [
        Validators.required,
        Validators.maxLength(200)
      ]
    ],
    relationshipCode: [this.data.nominee?.relationshipCode ?? null],
    relationshipDetail: [this.data.nominee?.relationshipDetail ?? null],
    mobileNo: [
      this.data.nominee?.mobileNo ?? '',
      Validators.maxLength(50)
    ],
    note: [
      '',
      Validators.maxLength(500)
    ]
  });

  save(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const text = (s: string | null | undefined) => (s ?? '').trim() || undefined;
    this.busy.set(true);
    this.membershipService
      .changeNominee(
        this.data.clientId,
        {
          name: text(v.name),
          relationshipCode: v.relationshipCode || undefined,
          // unchosen: the text typed before the list goes back as it is
          relationship: v.relationshipCode ? undefined : (this.typed ?? undefined),
          relationshipDetail: v.relationshipCode ? text(v.relationshipDetail) : undefined,
          mobileNo: text(v.mobileNo)
        },
        text(v.note)
      )
      .subscribe({
        next: (saved) => this.ref.close(saved),
        error: (err) => {
          this.busy.set(false);
          this.showOnFields(err);
        }
      });
  }

  /** Puts each 400 error on the field it names; the global error handler shows the message too. */
  private showOnFields(err: any): void {
    const fields: Record<string, string> = {
      nominee: 'name',
      'nominee.relationshipCode': 'relationshipCode',
      'nominee.relationshipDetail': 'relationshipDetail',
      note: 'note'
    };
    for (const e of err?.status === 400 ? (err.error?.errors ?? []) : []) {
      const control = this.form.get(fields[e.parameterName] ?? '');
      control?.setErrors({ server: e.defaultUserMessage });
      control?.markAsTouched();
    }
  }
}
