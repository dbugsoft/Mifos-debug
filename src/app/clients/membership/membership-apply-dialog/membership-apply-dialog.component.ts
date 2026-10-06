/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MembershipService } from '../membership.service';
import { MembershipApplication, MembershipTemplate } from '../membership.models';
import { MembershipSharesStepComponent } from '../membership-shares-step/membership-shares-step.component';

export interface MembershipApplyData {
  template: MembershipTemplate;
  clientId: number;
  name: string;
  /** again: a refused person applies again; existing: an application already made, entered with its original date */
  mode: 'again' | 'existing';
  /** The person's latest application, if any, for the citizenship number and nominee already on record */
  previous?: MembershipApplication | null;
}

/**
 * An application for a person already entered (fineract-dbug ADR 0035): a refused person applying again on their
 * existing record (their citizenship number is unique, so they cannot be entered twice), or, for an administrator, an
 * existing application of a client who was pending before the share-first rule, entered with its original date.
 */
@Component({
  selector: 'mifosx-membership-apply-dialog',
  template: `
    <h1 mat-dialog-title>
      {{
        (data.mode === 'again' ? 'membership.applyAgainTitle' : 'membership.enterExistingTitle')
          | translate: { name: data.name }
      }}
    </h1>
    <div mat-dialog-content>
      @if (data.mode === 'again') {
        <p class="lead">{{ 'membership.applyAgainLead' | translate }}</p>
      }
      <mifosx-membership-shares-step
        [template]="data.template"
        [mode]="data.mode"
        [embedded]="true"
        [hasCitizenship]="!!data.previous?.citizenshipNumber"
        [hasNominee]="!!data.previous?.nominee"
      ></mifosx-membership-shares-step>
    </div>
    <mat-dialog-actions align="end">
      <button mat-raised-button type="button" mat-dialog-close [disabled]="busy()">
        {{ 'labels.buttons.Cancel' | translate }}
      </button>
      <button mat-raised-button color="primary" type="button" (click)="submit()" [disabled]="busy() || !step?.valid()">
        {{ 'membership.Take the application' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .lead {
        margin: 0 0 4px;
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MembershipSharesStepComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipApplyDialogComponent {
  private dialogRef = inject<MatDialogRef<MembershipApplyDialogComponent, MembershipApplication>>(MatDialogRef);
  private membershipService = inject(MembershipService);
  readonly data = inject<MembershipApplyData>(MAT_DIALOG_DATA);
  readonly busy = signal(false);

  @ViewChild(MembershipSharesStepComponent, { static: true }) step?: MembershipSharesStepComponent;

  submit(): void {
    const request = this.step?.request();
    if (!request || !this.step?.valid() || this.busy()) {
      this.step?.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.membershipService.apply({ clientId: this.data.clientId, ...request }).subscribe({
      next: (application) => this.dialogRef.close(application),
      error: () => this.busy.set(false)
    });
  }
}
