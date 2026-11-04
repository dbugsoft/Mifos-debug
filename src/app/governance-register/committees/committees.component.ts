/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { GovernanceRegisterService } from '../governance-register.service';
import { Committee, Term, BUILT_IN_COMMITTEE_CODES } from '../governance-register.models';
import { isoDate } from '../governance-register.utils';
import { CommitteeDialogComponent, CommitteeDialogData } from './committee-dialog/committee-dialog.component';
import { TermDialogComponent, TermDialogData } from './term-dialog/term-dialog.component';
import { PositionsDialogComponent } from './positions-dialog/positions-dialog.component';

/**
 * The committees (board, accounts supervision, sub-committees, election committee, management), one row each -
 * who serves on a given one today (or on any day in the past, with `asOf`) is on its own detail page
 * (fineract-dbug #138; docs/governance-register.md).
 */
@Component({
  selector: 'mifosx-committees',
  templateUrl: './committees.component.html',
  styleUrls: ['./committees.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommitteesComponent implements OnInit {
  private governance = inject(GovernanceRegisterService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  readonly committees = signal<Committee[]>([]);
  readonly loading = signal(false);
  readonly includeInactive = signal(false);
  readonly asOf = new FormControl<Date | null>(null);
  readonly today = new Date();
  readonly builtInCodes = BUILT_IN_COMMITTEE_CODES;

  ngOnInit(): void {
    this.load();
    this.asOf.valueChanges.subscribe(() => this.load());
  }

  toggleInactive(e: MatCheckboxChange): void {
    this.includeInactive.set(e.checked);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.governance.committees(isoDate(this.asOf.value) ?? undefined, this.includeInactive()).subscribe({
      next: (c) => {
        this.committees.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  open(c: Committee): void {
    this.router.navigate([
      '/governance-register/committees',
      c.id
    ]);
  }

  managePositions(): void {
    this.dialog.open(PositionsDialogComponent, { width: '480px', maxWidth: '96vw', autoFocus: false });
  }

  addCommittee(): void {
    this.dialog
      .open<CommitteeDialogComponent, CommitteeDialogData, Committee>(CommitteeDialogComponent, {
        data: {},
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((created) => created && this.load());
  }

  editCommittee(c: Committee): void {
    this.dialog
      .open<CommitteeDialogComponent, CommitteeDialogData, Committee>(CommitteeDialogComponent, {
        data: { committee: c },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((saved) => saved && this.load());
  }

  addPerson(c: Committee): void {
    this.dialog
      .open<TermDialogComponent, TermDialogData, Term>(TermDialogComponent, {
        data: { committee: c },
        width: '640px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((added) => added && this.load());
  }

  committeeLabel(c: Committee): string {
    return this.builtInCodes.includes(c.code) ? `governanceRegister.committee.${c.code}` : c.name;
  }
}
