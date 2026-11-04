/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { InputDialogComponent, InputDialogData } from 'app/compliance/input-dialog/input-dialog.component';
import { BUILT_IN_COMMITTEE_CODES, Committee } from 'app/governance-register/governance-register.models';
import { ElectionsService } from '../../elections.service';
import { Election, Nomination } from '../../elections.models';
import { nominationStatusChipClass } from '../../elections.status';
import {
  AddCandidateDialogComponent,
  AddCandidateDialogData
} from './add-candidate-dialog/add-candidate-dialog.component';

/**
 * The candidates for an election, in one table ordered by committee and position (fineract-dbug #144). A refused
 * candidate is not an error - they are saved, with every reason they were refused shown underneath their name.
 */
@Component({
  selector: 'mifosx-candidates',
  templateUrl: './candidates.component.html',
  styleUrls: ['./candidates.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CandidatesComponent {
  private electionsService = inject(ElectionsService);
  private dialog = inject(MatDialog);

  @Input({ required: true }) election!: Election;
  /** Shows votes/elected once results are in, instead of only during ROLL_FROZEN/LIST_PUBLISHED. */
  @Input() showResults = false;
  @Output() readonly updated = new EventEmitter<Election>();

  readonly builtInCodes = BUILT_IN_COMMITTEE_CODES;
  readonly statusChipClass = nominationStatusChipClass;

  committeeLabel(c: Pick<Committee, 'code' | 'name'>): string {
    return this.builtInCodes.includes(c.code) ? `governanceRegister.committee.${c.code}` : c.name;
  }

  positionLabel(positionCode: string, positionName: string): string {
    return positionCode.startsWith('OWN_') ? positionName : `governanceRegister.position.${positionCode}`;
  }

  /** A nomination's own committee, for the one merged table's Position column. */
  nominationCommitteeLabel(n: Nomination): string {
    return this.committeeLabel({ code: n.committeeCode, name: n.committeeName });
  }

  /** Every candidate in one table, committee and position still kept together rather than interleaved. */
  get orderedNominations(): Nomination[] {
    return [...this.election.nominations].sort((a, b) => {
      if (a.committeeCode !== b.committeeCode) {
        return a.committeeCode < b.committeeCode ? -1 : 1;
      }
      return a.positionCode < b.positionCode ? -1 : a.positionCode > b.positionCode ? 1 : 0;
    });
  }

  hasFamilyWarning(n: Nomination): boolean {
    return n.warnings.some((w) => w.code === 'FAMILY_ALSO_STANDING');
  }

  canAddCandidate(): boolean {
    return this.election.status === 'ROLL_FROZEN';
  }

  canWithdraw(n: Nomination): boolean {
    return (
      n.status !== 'WITHDRAWN' && (this.election.status === 'ROLL_FROZEN' || this.election.status === 'LIST_PUBLISHED')
    );
  }

  addCandidate(): void {
    this.dialog
      .open<AddCandidateDialogComponent, AddCandidateDialogData, Election>(AddCandidateDialogComponent, {
        data: { election: this.election },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.updated.emit(updated));
  }

  withdraw(n: Nomination): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'elections.WithdrawCandidateTitle',
          message: n.name,
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'elections.WithdrawCandidate',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r?.reason) {
          this.electionsService.withdrawNomination(n.id, r.reason).subscribe((updated) => this.updated.emit(updated));
        }
      });
  }
}
