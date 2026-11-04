/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { MeetingsService } from 'app/governance-register/meetings/meetings.service';
import { Decision, MeetingSummary } from 'app/governance-register/meetings/meetings.models';
import { ElectionsService } from '../../elections.service';
import { isoDate, parseDate } from '../../elections.utils';
import { Election, ElectionResultEntry, Nomination } from '../../elections.models';
import { DecisionPickerComponent } from '../../decision-picker/decision-picker.component';

export interface ResultsDialogData {
  election: Election;
}

interface ResultRow {
  nomination: Nomination;
  votes: FormControl<number | null>;
  elected: FormControl<boolean>;
}

interface ResultGroup {
  committeeName: string;
  positionName: string;
  rows: ResultRow[];
}

/**
 * Declares an election's results: the general meeting it was declared at, the terms it starts, and who is elected
 * (fineract-dbug #144). This cannot be undone - the terms now serving on these committees end, and the elected
 * start theirs - so it is shown as a confirm step before the call is made.
 */
@Component({
  selector: 'mifosx-results-dialog',
  templateUrl: './results-dialog.component.html',
  styleUrls: ['./results-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    AdToBsPipe,
    NepaliDateInputComponent,
    DecisionPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultsDialogComponent {
  readonly data = inject<ResultsDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ResultsDialogComponent, Election>);
  private meetingsService = inject(MeetingsService);
  private electionsService = inject(ElectionsService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly step = signal<'form' | 'confirm'>('form');
  readonly today = new Date();

  readonly meetings = signal<MeetingSummary[]>([]);
  readonly pickedMeeting = signal<MeetingSummary | null>(null);
  readonly pickedDecision = signal<Decision | null>(null);
  readonly termsStartOn = new FormControl<Date | null>(null, Validators.required);
  /** Tracks the value this dialog itself last set, so picking a different meeting still re-defaults the date -
   * but only while the clerk hasn't typed their own value over it. */
  private lastAutoFilled: number | null = null;

  readonly rows: ResultRow[] = this.data.election.nominations
    .filter((n) => n.status === 'ACCEPTED')
    .map((n) => ({
      nomination: n,
      votes: new FormControl<number | null>(null, Validators.min(0)),
      elected: new FormControl<boolean>(false, { nonNullable: true })
    }));

  constructor() {
    forkJoin([
      this.meetingsService.meetings('ANNUAL_GENERAL'),
      this.meetingsService.meetings('SPECIAL_GENERAL')
    ]).subscribe(
      ([
        annual,
        special
      ]) => {
        const merged = [
          ...annual,
          ...special
        ]
          .filter((m) => m.status !== 'VOIDED')
          .sort((a, b) => (a.heldOn < b.heldOn ? 1 : a.heldOn > b.heldOn ? -1 : 0));
        this.meetings.set(merged);
      }
    );
  }

  get groups(): ResultGroup[] {
    const groups: ResultGroup[] = [];
    for (const row of this.rows) {
      const n = row.nomination;
      let group = groups.find((g) => g.committeeName === n.committeeName && g.positionName === n.positionName);
      if (!group) {
        group = { committeeName: n.committeeName, positionName: n.positionName, rows: [] };
        groups.push(group);
      }
      group.rows.push(row);
    }
    return groups;
  }

  pickMeeting(m: MeetingSummary): void {
    this.pickedMeeting.set(m);
    this.pickedDecision.set(null);
    const current = this.termsStartOn.value;
    if (current === null || current.getTime() === this.lastAutoFilled) {
      const heldOn = parseDate(m.heldOn);
      this.termsStartOn.setValue(heldOn);
      this.lastAutoFilled = heldOn?.getTime() ?? null;
    }
  }

  pickDecision(d: Decision): void {
    this.pickedDecision.set(d);
  }

  clearDecision(): void {
    this.pickedDecision.set(null);
  }

  get minTermsStart(): Date | undefined {
    return parseDate(this.pickedMeeting()?.heldOn) ?? undefined;
  }

  get termsStartInvalid(): boolean {
    const v = this.termsStartOn.value;
    const min = this.minTermsStart;
    return !v || (!!min && v.getTime() < min.getTime()) || v.getTime() > this.today.getTime();
  }

  /** At least one candidate must be marked elected, or the server refuses the whole declaration anyway
   * ("Mark who was elected.") - checked client-side so that failure shows before a network round trip, not after. */
  get hasElected(): boolean {
    return this.rows.some((r) => r.elected.value);
  }

  get formValid(): boolean {
    return !!this.pickedMeeting() && !this.termsStartInvalid && this.rows.length > 0;
  }

  next(): void {
    if (!this.formValid) {
      return;
    }
    if (!this.hasElected) {
      this.serverError.set('Mark at least one candidate as elected before declaring results.');
      return;
    }
    this.serverError.set(null);
    this.step.set('confirm');
  }

  back(): void {
    this.step.set('form');
  }

  confirm(): void {
    const meeting = this.pickedMeeting();
    if (!meeting) {
      return;
    }
    const results: ElectionResultEntry[] = this.rows.map((r) => {
      const entry: ElectionResultEntry = { nominationId: r.nomination.id, elected: r.elected.value };
      const votes = r.votes.value;
      if (votes !== null && votes !== undefined) {
        entry.votes = votes;
      }
      return entry;
    });
    this.busy.set(true);
    this.serverError.set(null);
    this.electionsService
      .declare(this.data.election.id, {
        meetingId: meeting.id,
        decisionId: this.pickedDecision()?.id,
        termsStartOn: isoDate(this.termsStartOn.value),
        results
      })
      .subscribe({
        next: (updated) => this.ref.close(updated),
        error: (e) => {
          this.busy.set(false);
          this.serverError.set(e?.error?.defaultUserMessage || e?.error?.errors?.[0]?.defaultUserMessage || null);
          this.step.set('form');
        }
      });
  }
}
