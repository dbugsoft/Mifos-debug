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
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { KymService } from '../kym.service';
import { KymPerson, KymView, OWNER_CONTROLS, OWNER_IDENTIFIED_BY } from '../kym.models';
import { KymMemberPickerComponent } from '../member-picker/member-picker.component';

/**
 * Names a beneficial owner (fineract-dbug #199): a member here, or anyone else by name, citizenship number and date of
 * birth; how they control or benefit from the account; how staff identified them; and the four checks staff made.
 */
@Component({
  selector: 'mifosx-kym-owner-dialog',
  template: `
    <h2 mat-dialog-title>{{ 'kym.Add an owner' | translate }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <p class="lead">{{ 'kym.ownerLead' | translate }}</p>
        <mat-radio-group class="yes-no" [value]="isMember()" (change)="isMember.set($event.value)">
          <mat-radio-button [value]="true">{{ 'kym.A member here' | translate }}</mat-radio-button>
          <mat-radio-button [value]="false">{{ 'kym.Someone else' | translate }}</mat-radio-button>
        </mat-radio-group>
        @if (isMember()) {
          @if (member(); as m) {
            <div class="person">
              <span>{{ m.name }} · {{ m.accountNo }}</span>
              <button
                mat-icon-button
                type="button"
                (click)="member.set(null)"
                [attr.aria-label]="'kym.Remove' | translate"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          } @else {
            <mifosx-kym-member-picker
              [exclude]="data.clientId"
              (picked)="member.set($event)"
            ></mifosx-kym-member-picker>
          }
        } @else {
          <div class="row">
            <mat-form-field>
              <mat-label>{{ 'kym.Name' | translate }}</mat-label>
              <input matInput formControlName="ownerName" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'kym.Citizenship number' | translate }}</mat-label>
              <input matInput formControlName="citizenshipNo" />
            </mat-form-field>
          </div>
          <mifosx-nepali-date-input
            formControlName="dateOfBirth"
            [label]="'kym.Date of birth' | translate"
            [maxDate]="today"
          ></mifosx-nepali-date-input>
        }
        <div class="row">
          <mat-form-field>
            <mat-label>{{ 'kym.Relationship' | translate }}</mat-label>
            <input matInput formControlName="relationship" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'kym.How' | translate }}</mat-label>
            <mat-select formControlName="control" required>
              @for (c of controls; track c) {
                <mat-option [value]="c">{{ 'kym.control.' + c | translate }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <div class="row">
          <mat-form-field>
            <mat-label>{{ 'kym.Details' | translate }}</mat-label>
            <input matInput formControlName="controlDetail" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'kym.Share (%)' | translate }}</mat-label>
            <input matInput type="number" min="0" max="100" formControlName="sharePercent" />
          </mat-form-field>
        </div>
        <mat-form-field class="full">
          <mat-label>{{ 'kym.Identified by' | translate }}</mat-label>
          <mat-select formControlName="identifiedBy" required>
            @for (i of identifiedBy; track i) {
              <mat-option [value]="i">{{ 'kym.identified.' + i | translate }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <h4>{{ 'kym.Checks' | translate }}</h4>
        @for (c of checks; track c) {
          <mat-radio-group class="yes-no" [formControlName]="c">
            <span class="q">{{ 'kym.check.' + c | translate }}</span>
            <mat-radio-button [value]="true">{{ 'kym.Yes' | translate }}</mat-radio-button>
            <mat-radio-button [value]="false">{{ 'kym.No' | translate }}</mat-radio-button>
          </mat-radio-group>
        }
        <mat-form-field class="full">
          <mat-label>{{ 'kym.Notes on the checks' | translate }}</mat-label>
          <textarea matInput formControlName="checkNote" rows="2"></textarea>
        </mat-form-field>
        <mat-checkbox formControlName="inPerson">{{ 'kym.inPersonLabel' | translate }}</mat-checkbox>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-raised-button type="button" mat-dialog-close [disabled]="busy()">
          {{ 'labels.buttons.Cancel' | translate }}
        </button>
        <button mat-raised-button color="primary" type="submit" [disabled]="busy() || !ready()">
          {{ 'kym.Save' | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .lead {
        margin: 0 0 8px;
        color: var(--mat-sys-on-surface-variant);
        font-size: 0.875rem;
      }
      h4 {
        margin: 12px 0 4px;
        font-size: 0.95rem;
        font-weight: 600;
      }
      .row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0 16px;
      }
      .full {
        width: 100%;
      }
      .yes-no {
        display: flex;
        flex-wrap: wrap;
        gap: 2px 16px;
        align-items: center;
        margin: 4px 0 8px;
      }
      .yes-no .q {
        flex-basis: 100%;
        font-size: 0.875rem;
      }
      .person {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 500;
      }
      mat-checkbox {
        display: block;
        margin: 8px 0;
        font-weight: 600;
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
    MatRadioGroup,
    MatRadioButton,
    MatIcon,
    NepaliDateInputComponent,
    KymMemberPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KymOwnerDialogComponent {
  readonly data = inject<{ clientId: number }>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<KymOwnerDialogComponent, KymView>);
  private kymService = inject(KymService);

  readonly controls = OWNER_CONTROLS;
  readonly identifiedBy = OWNER_IDENTIFIED_BY;
  readonly checks = [
    'detailsMatch',
    'otherInfluence',
    'positionNormal',
    'publicConsistent'
  ];
  readonly today = new Date();
  readonly isMember = signal(false);
  readonly member = signal<KymPerson | null>(null);
  readonly busy = signal(false);

  readonly form = inject(FormBuilder).group({
    ownerName: [
      '',
      Validators.maxLength(200)
    ],
    citizenshipNo: [
      '',
      Validators.maxLength(50)
    ],
    dateOfBirth: [null as Date | null],
    relationship: [
      '',
      Validators.maxLength(100)
    ],
    control: [
      '',
      Validators.required
    ],
    controlDetail: [
      '',
      Validators.maxLength(500)
    ],
    sharePercent: [
      null as number | null,
      [
        Validators.min(0),
        Validators.max(100)
      ]
    ],
    identifiedBy: [
      '',
      Validators.required
    ],
    detailsMatch: [null as boolean | null],
    otherInfluence: [null as boolean | null],
    positionNormal: [null as boolean | null],
    publicConsistent: [null as boolean | null],
    checkNote: [
      '',
      Validators.maxLength(1000)
    ],
    inPerson: [
      false,
      Validators.requiredTrue
    ]
  });

  ready(): boolean {
    const v = this.form.value;
    const who = this.isMember()
      ? !!this.member()
      : !!v.ownerName?.trim() && !!v.citizenshipNo?.trim() && !!v.dateOfBirth;
    return who && this.form.valid;
  }

  save(): void {
    if (!this.ready()) {
      this.form.markAllAsTouched();
      return;
    }
    const { inPerson, dateOfBirth, ...v } = this.form.getRawValue();
    const body: Record<string, unknown> = { ...v };
    if (this.isMember()) {
      body['ownerClientId'] = this.member()?.clientId;
      delete body['ownerName'];
      delete body['citizenshipNo'];
    } else if (dateOfBirth) {
      const d = dateOfBirth;
      body['dateOfBirth'] =
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    for (const k of Object.keys(body)) {
      if (body[k] === '') {
        body[k] = null;
      }
    }
    this.busy.set(true);
    this.kymService.addOwner(this.data.clientId, body).subscribe({
      next: (k) => this.ref.close(k),
      error: () => this.busy.set(false)
    });
  }
}
