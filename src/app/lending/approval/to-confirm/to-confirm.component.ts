/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateService } from '@ngx-translate/core';
import { Observable, map, of } from 'rxjs';
import { Decision as MeetingDecision } from 'app/governance-register/meetings/meetings.models';
import { MeetingsService } from 'app/governance-register/meetings/meetings.service';
import { FormDialogComponent } from 'app/shared/form-dialog/form-dialog.component';
import { SelectBase } from 'app/shared/form-dialog/formfield/model/select-base';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanFileService } from '../../files/loan-file.service';
import { injectHasPermission } from '../../permissions';
import { ApprovalService, ToConfirm } from '../approval.service';

/**
 * Lending › To confirm (fineract-dbug #326): approvals a small office's recommender made themselves, waiting for the
 * next committee meeting. The committee secretary confirms each with the meeting's decision.
 */
@Component({
  selector: 'mifosx-to-confirm',
  templateUrl: './to-confirm.component.html',
  styleUrls: ['./to-confirm.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    MatTable,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatCell,
    MatCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    FaIconComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToConfirmComponent implements OnInit {
  private approvals = inject(ApprovalService);
  private files = inject(LoanFileService);
  private meetings = inject(MeetingsService);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly rows = signal<ToConfirm[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly columns = [
    'clientName',
    'accountNo',
    'amount',
    'decidedBy',
    'decidedOn',
    ...(injectHasPermission()('RECOMMEND_LOANFILE') ? ['confirm'] : [])
  ];
  private committeeDecisions: MeetingDecision[] | null = null;

  ngOnInit(): void {
    this.loading.set(true);
    this.approvals
      .toConfirm()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.failed.set(true);
          this.loading.set(false);
        }
      });
  }

  date(value: string | null): string {
    return this.files.bsDate(value);
  }

  /** Decisions recorded in a committee's meeting, fetched once: any committee may confirm. */
  private decisions(): Observable<MeetingDecision[]> {
    if (this.committeeDecisions) {
      return of(this.committeeDecisions);
    }
    return this.meetings
      .decisions()
      .pipe(map((list) => (this.committeeDecisions = (list ?? []).filter((d) => d.committeeCode && !d.voided))));
  }

  confirm(row: ToConfirm): void {
    this.decisions().subscribe((list) => {
      const picker = new SelectBase({
        controlName: 'govDecisionId',
        label: this.translate.instant('lending.approvalTab.Meeting decision'),
        options: {
          label: 'text',
          value: 'id',
          data: list.map((d) => ({ id: d.id, text: `${d.reference} · ${d.subject}` }))
        },
        required: true,
        order: 1
      });
      this.dialog
        .open(FormDialogComponent, {
          data: {
            title: this.translate.instant('lending.toConfirm.confirmTitle', { member: row.clientName }),
            layout: { addButtonText: 'Confirm' },
            formfields: [picker]
          }
        })
        .afterClosed()
        .subscribe((response: { data?: FormGroup }) => {
          const id = response?.data?.value?.govDecisionId;
          if (!id) {
            return;
          }
          this.busy.set(true);
          this.approvals.confirm(row.decisionId, id).subscribe({
            next: (rows) => {
              this.rows.set(rows);
              this.busy.set(false);
            },
            error: () => this.busy.set(false)
          });
        });
    });
  }
}
