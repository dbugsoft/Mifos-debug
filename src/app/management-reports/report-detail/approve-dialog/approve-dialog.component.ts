/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatIcon } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { GovernanceRegisterService } from 'app/governance-register/governance-register.service';
import { MeetingsService } from 'app/governance-register/meetings/meetings.service';
import { Decision } from 'app/governance-register/meetings/meetings.models';
import { ManagementReportsService } from '../../management-reports.service';
import { applyServerErrors } from '../../management-reports.utils';
import { Report } from '../../management-reports.models';

export interface ApproveDialogData {
  report: Report;
  action: 'approve' | 'return';
}

/**
 * Records the board's decision on a submitted report (fineract-dbug #142/#145): `command=approve`/`return` with the
 * `decisionId` of the board meeting's decision. Picks from the board committee's decisions (GET
 * meetings/decisions?committeeId=<board>), limited on the client to a meeting held on or after the period's last
 * day - the server is the final word and refuses anything earlier.
 */
@Component({
  selector: 'mifosx-approve-dialog',
  templateUrl: './approve-dialog.component.html',
  styleUrls: ['./approve-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatIcon,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApproveDialogComponent {
  readonly data = inject<ApproveDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ApproveDialogComponent, Report>);
  private reportsService = inject(ManagementReportsService);
  private governance = inject(GovernanceRegisterService);
  private meetingsService = inject(MeetingsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly boardCommitteeId = signal<number | null>(null);
  readonly decisionsForbidden = signal(false);
  readonly decisionSearch = new FormControl('');
  readonly foundDecisions = signal<Decision[]>([]);
  readonly decisionSearched = signal(false);
  readonly pickedDecision = signal<Decision | null>(null);

  readonly form = inject(FormBuilder).group({
    decisionId: [
      null as number | null,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],
    note: [
      '',
      Validators.maxLength(1000)
    ]
  });

  constructor() {
    this.governance.committees().subscribe({
      next: (committees) => this.boardCommitteeId.set(committees.find((c) => c.kind === 'BOARD')?.id ?? null),
      error: (e) => {
        if (e?.status === 403) {
          this.decisionsForbidden.set(true);
        }
      }
    });

    this.decisionSearch.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string' && v.trim().length >= 2),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.decisionSearched.set(true)),
        switchMap((v) => this.meetingsService.decisions(undefined, this.boardCommitteeId() ?? undefined, undefined, v)),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe({
        next: (ds) => this.foundDecisions.set(ds.filter((d) => d.heldOn >= this.data.report.to)),
        error: (e) => {
          if (e?.status === 403) {
            this.decisionsForbidden.set(true);
          }
        }
      });
  }

  pickDecision(d: Decision): void {
    this.pickedDecision.set(d);
    this.form.controls.decisionId.setValue(d.id);
    this.decisionSearch.setValue('');
    this.foundDecisions.set([]);
  }

  clearDecision(): void {
    this.pickedDecision.set(null);
    this.form.controls.decisionId.setValue(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.serverError.set(null);
    const call =
      this.data.action === 'approve'
        ? this.reportsService.approve(this.data.report.id, v.decisionId!, v.note?.trim() || null)
        : this.reportsService.returnReport(this.data.report.id, v.decisionId!, v.note?.trim() || null);

    call.subscribe({
      next: (r) => this.ref.close(r),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(applyServerErrors(this.form, e?.error?.errors));
      }
    });
  }
}
