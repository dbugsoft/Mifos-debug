/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { GovernanceRegisterService } from '../../governance-register.service';
import { Committee, BUILT_IN_COMMITTEE_CODES } from '../../governance-register.models';
import { MeetingsService } from '../meetings.service';
import { MEETING_KINDS, Meeting, MeetingSummary } from '../meetings.models';
import { statusChipClass } from '../meetings.status';
import { CreateMeetingDialogComponent } from './create-meeting-dialog/create-meeting-dialog.component';

/** The meetings register: filters and the list, newest first (fineract-dbug #141). */
@Component({
  selector: 'mifosx-meetings-list',
  templateUrl: './meetings-list.component.html',
  styleUrls: ['./meetings-list.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MeetingsListComponent implements OnInit {
  private meetingsService = inject(MeetingsService);
  private governance = inject(GovernanceRegisterService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  readonly meetings = signal<MeetingSummary[]>([]);
  readonly committees = signal<Committee[]>([]);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly statusChipClass = statusChipClass;
  readonly kinds = MEETING_KINDS;

  readonly kind = new FormControl<string | null>(null);
  readonly committeeId = new FormControl<number | null>(null);
  readonly fiscalYear = new FormControl<number | null>(null);

  ngOnInit(): void {
    this.governance.committees(undefined, true).subscribe((c) => this.committees.set(c));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.meetingsService
      .meetings(this.kind.value ?? undefined, this.committeeId.value ?? undefined, this.fiscalYear.value ?? undefined)
      .subscribe({
        next: (m) => {
          this.meetings.set(m);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadFailed.set(true);
        }
      });
  }

  open(m: MeetingSummary): void {
    this.router.navigate([
      '/governance-register/meetings',
      m.id
    ]);
  }

  bodyName(m: MeetingSummary): string {
    if (m.committeeCode) {
      return BUILT_IN_COMMITTEE_CODES.includes(m.committeeCode)
        ? `governanceRegister.committee.${m.committeeCode}`
        : m.committeeName || m.committeeCode;
    }
    return m.committeeName || 'meetings.GeneralMeeting';
  }

  newMeeting(): void {
    this.dialog
      .open<CreateMeetingDialogComponent, { committees: Committee[] }, Meeting>(CreateMeetingDialogComponent, {
        data: { committees: this.committees() },
        width: '620px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.router.navigate([
            '/governance-register/meetings',
            created.id
          ]);
        }
      });
  }
}
