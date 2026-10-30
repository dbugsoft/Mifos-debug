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
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { KymMemberPickerComponent } from 'app/clients/kym/member-picker/member-picker.component';
import { KymPerson } from 'app/clients/kym/kym.models';
import { RelationshipSelectComponent } from 'app/shared/relationship-select/relationship-select.component';
import { RelatedPartiesService } from '../related-parties.service';
import { applyServerErrors } from '../related-parties.utils';
import { NotLinked, PersonParties } from '../related-parties.models';

export interface LinkDialogData {
  personId: number;
  officerName: string;
  /** A family member on the officer's own KYM record, not yet linked to a member - prefills the suggestion, if any */
  suggested?: NotLinked;
}

/** Links a member to a person in the register (fineract-dbug #139: POST people/{personId}/links). */
@Component({
  selector: 'mifosx-link-dialog',
  templateUrl: './link-dialog.component.html',
  styleUrls: ['./link-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    KymMemberPickerComponent,
    RelationshipSelectComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkDialogComponent {
  readonly data = inject<LinkDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<LinkDialogComponent, PersonParties>);
  private relatedParties = inject(RelatedPartiesService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly picked = signal<KymPerson | null>(null);

  readonly form = inject(FormBuilder).group({
    relationshipCode: [
      null as string | null,
      Validators.required
    ],
    relationshipDetail: [null as string | null],
    marriageEnded: [false],
    note: [
      '',
      Validators.maxLength(500)
    ]
  });

  useSuggested(): void {
    const s = this.data.suggested;
    if (s?.possibleClientId && s.possibleName) {
      this.picked.set({ clientId: s.possibleClientId, name: s.possibleName, accountNo: s.possibleAccountNo ?? '' });
    }
  }

  pickMember(p: KymPerson): void {
    this.picked.set(p);
  }

  save(): void {
    const member = this.picked();
    if (!member || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    this.relatedParties
      .addLink(this.data.personId, {
        clientId: member.clientId,
        relationshipCode: v.relationshipCode,
        relationshipDetail: v.relationshipDetail,
        marriageEnded: v.marriageEnded,
        note: v.note?.trim() || null
      })
      .subscribe({
        next: (p) => this.ref.close(p),
        error: (e) => {
          this.busy.set(false);
          this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
        }
      });
  }
}
