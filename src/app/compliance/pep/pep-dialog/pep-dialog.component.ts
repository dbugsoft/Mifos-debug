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
import { Pep, PepService, PepSuggestion, PepTemplate } from '../pep.service';

export interface PepDialogData {
  /** Changing a person already on the register */
  pep?: Pep;
  /** Adding a person the system suggested: their details and the member they expose come with it */
  suggestion?: PepSuggestion;
}

function iso(d: Date | null): string | null {
  return d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : null;
}

function date(s: string | null | undefined): Date | null {
  return s ? new Date(s + 'T00:00:00') : null;
}

/**
 * Adds a politically exposed person to the register, or changes one (fineract-dbug #200, #136): the post, when they
 * took and left office (the record is then kept ten years, longer if chosen), where the information came from.
 */
@Component({
  selector: 'mifosx-pep-dialog',
  templateUrl: './pep-dialog.component.html',
  styleUrls: ['./pep-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PepDialogComponent {
  readonly data = inject<PepDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<PepDialogComponent, Pep>);
  private peps = inject(PepService);

  readonly template = signal<PepTemplate | null>(null);
  readonly busy = signal(false);
  readonly today = new Date();
  readonly editing = !!this.data.pep;

  readonly form = inject(FormBuilder).group({
    fullName: [
      this.data.pep?.fullName ?? this.data.suggestion?.fullName ?? '',
      [
        Validators.required,
        Validators.maxLength(200)
      ]
    ],
    category: [this.data.pep?.category ?? 'DOMESTIC'],
    postId: [this.data.pep?.postId ?? (null as number | null)],
    postDetail: [
      this.data.pep?.postDetail ?? this.data.suggestion?.post ?? '',
      Validators.maxLength(200)
    ],
    citizenshipNo: [
      this.data.pep?.citizenshipNo ?? '',
      Validators.maxLength(50)
    ],
    dateOfBirth: [date(this.data.pep?.dateOfBirth)],
    startedOn: [date(this.data.pep?.startedOn)],
    leftOfficeOn: [date(this.data.pep?.leftOfficeOn)],
    retainUntil: [date(this.data.pep?.retainUntil)],
    source: [
      this.data.pep?.source ?? (this.data.suggestion?.from === 'KYM' ? 'MEMBER' : (null as string | null)),
      Validators.required
    ],
    evidence: [
      this.data.pep?.evidence ?? '',
      Validators.maxLength(1000)
    ]
  });

  constructor() {
    this.peps.template().subscribe((t) => this.template.set(t));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      fullName: v.fullName?.trim(),
      category: v.category,
      postId: v.postId,
      postDetail: v.postDetail?.trim() || null,
      citizenshipNo: v.citizenshipNo?.trim() || null,
      dateOfBirth: iso(v.dateOfBirth),
      startedOn: iso(v.startedOn),
      leftOfficeOn: iso(v.leftOfficeOn),
      source: v.source,
      evidence: v.evidence?.trim() || null
    };
    this.busy.set(true);
    let call;
    if (this.editing) {
      if (v.leftOfficeOn) {
        body['retainUntil'] = iso(v.retainUntil);
      }
      call = this.peps.update(this.data.pep!.id, body);
    } else {
      const s = this.data.suggestion;
      if (s) {
        body['suggestionKey'] = s.suggestionKey;
        if (s.clientId) {
          body['clientId'] = s.clientId;
        }
        if (s.familyMemberId) {
          body['familyMemberId'] = s.familyMemberId;
        }
        if (s.relationship !== 'SELF') {
          body['links'] = [
            { clientId: s.memberId, relationship: s.relationship, relationshipDetail: s.relationshipDetail }
          ];
        }
      }
      call = this.peps.create(body);
    }
    call.subscribe({
      next: (p) => this.ref.close(p),
      error: () => this.busy.set(false)
    });
  }
}
