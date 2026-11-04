/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { BsCalendarService } from 'app/core/bs-calendar/bs-calendar.service';
import { InputDialogComponent, InputDialogData } from 'app/compliance/input-dialog/input-dialog.component';
import { BUILT_IN_COMMITTEE_CODES, Committee } from 'app/governance-register/governance-register.models';
import { ElectionsService } from '../elections.service';
import { parseDate } from '../elections.utils';
import { Election } from '../elections.models';
import { electionStatusChipClass } from '../elections.status';
import { CandidatesComponent } from './candidates/candidates.component';
import { VoterRollComponent } from './voter-roll/voter-roll.component';
import {
  EditElectionDialogComponent,
  EditElectionDialogData
} from './edit-election-dialog/edit-election-dialog.component';
import { ResultsDialogComponent, ResultsDialogData } from './results-dialog/results-dialog.component';

/**
 * One election: the voter roll, the candidates, and the OPEN -> ROLL_FROZEN -> LIST_PUBLISHED -> DECLARED lifecycle
 * (or CANCELLED, at any point before the results) (fineract-dbug #144; docs/governance-elections.md). Every command
 * and nomination call returns the whole election, so the page's state is simply replaced each time.
 */
@Component({
  selector: 'mifosx-election-detail',
  templateUrl: './election-detail.component.html',
  styleUrls: ['./election-detail.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    MatTabsModule,
    MatTooltip,
    AdToBsPipe,
    CandidatesComponent,
    VoterRollComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ElectionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private electionsService = inject(ElectionsService);
  private dialog = inject(MatDialog);
  private bsCalendar = inject(BsCalendarService);
  private destroyRef = inject(DestroyRef);

  readonly election = signal<Election | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly statusChipClass = electionStatusChipClass;
  readonly builtInCodes = BUILT_IN_COMMITTEE_CODES;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => this.load(Number(p.get('id'))));
  }

  private load(id: number): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.electionsService.election(id).subscribe({
      next: (e) => {
        this.election.set(e);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  committeeLabel(c: Pick<Committee, 'code' | 'name'>): string {
    return this.builtInCodes.includes(c.code) ? `governanceRegister.committee.${c.code}` : c.name;
  }

  positionLabel(positionCode: string, positionName: string): string {
    return positionCode.startsWith('OWN_') ? positionName : `governanceRegister.position.${positionCode}`;
  }

  /** A two-letter avatar badge from a "First Last" committee member's name. */
  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return '';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /** The roll is taken once, from the records as they stood on the cut-off day - not any day before it. */
  get canFreezeRoll(): boolean {
    const e = this.election();
    if (!e) {
      return false;
    }
    const cutOff = parseDate(e.cutOffOn);
    return !!cutOff && this.bsCalendar.todayInNepal().getTime() >= cutOff.getTime();
  }

  edit(): void {
    const e = this.election();
    if (!e) {
      return;
    }
    this.dialog
      .open<EditElectionDialogComponent, EditElectionDialogData, Election>(EditElectionDialogComponent, {
        data: { election: e },
        width: '560px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.election.set(updated));
  }

  freezeRoll(): void {
    const e = this.election();
    if (!e) {
      return;
    }
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, never>>(InputDialogComponent, {
        data: {
          title: 'elections.FreezeRollTitle',
          message: 'elections.FreezeRollMessage',
          fields: [],
          confirm: 'elections.FreezeRoll'
        },
        width: '480px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          this.electionsService.freezeRoll(e.id).subscribe((updated) => this.election.set(updated));
        }
      });
  }

  publish(): void {
    const e = this.election();
    if (!e) {
      return;
    }
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, never>>(InputDialogComponent, {
        data: {
          title: 'elections.PublishTitle',
          message: 'elections.PublishMessage',
          fields: [],
          confirm: 'elections.Publish'
        },
        width: '480px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          this.electionsService.publish(e.id).subscribe((updated) => this.election.set(updated));
        }
      });
  }

  cancel(): void {
    const e = this.election();
    if (!e) {
      return;
    }
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'elections.CancelElectionTitle',
          message: e.title,
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'elections.CancelElection',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r?.reason) {
          this.electionsService.cancel(e.id, r.reason).subscribe((updated) => this.election.set(updated));
        }
      });
  }

  enterResults(): void {
    const e = this.election();
    if (!e) {
      return;
    }
    this.dialog
      .open<ResultsDialogComponent, ResultsDialogData, Election>(ResultsDialogComponent, {
        data: { election: e },
        width: '720px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.election.set(updated));
  }

  onUpdated(updated: Election): void {
    this.election.set(updated);
  }
}
