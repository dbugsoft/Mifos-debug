/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { InputDialogComponent, InputDialogData } from 'app/compliance/input-dialog/input-dialog.component';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { BUILT_IN_COMMITTEE_CODES } from '../../governance-register.models';
import { MeetingsService } from '../meetings.service';
import { isoDate, parseDate, saveBlob } from '../meetings.utils';
import { statusChipClass } from '../meetings.status';
import { ATTENDANCE_STATUSES, Decision, FileEntry, Meeting } from '../meetings.models';
import { DecisionDialogComponent, DecisionDialogData } from './decision-dialog/decision-dialog.component';
import { CorrectionDialogComponent, CorrectionDialogData } from './correction-dialog/correction-dialog.component';
import {
  ApproveMeetingDialogComponent,
  ApproveMeetingDialogData
} from './approve-meeting-dialog/approve-meeting-dialog.component';

/** One meeting: attendance, decisions, minutes, and the draft/approved/corrections lifecycle (fineract-dbug #141). */
@Component({
  selector: 'mifosx-meeting-detail',
  templateUrl: './meeting-detail.component.html',
  styleUrls: ['./meeting-detail.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    MatTabsModule,
    MatTooltip,
    AdToBsPipe,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MeetingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private meetingsService = inject(MeetingsService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly meeting = signal<Meeting | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly statusChipClass = statusChipClass;
  readonly attendanceStatuses = ATTENDANCE_STATUSES;

  readonly heldOn = new FormControl<Date | null>(null);
  readonly place = new FormControl('');
  readonly agenda = new FormControl('');
  readonly attendanceNote = new FormControl('');
  readonly membersPresent = new FormControl<number | null>(null);
  readonly savingDetails = signal(false);
  readonly detailsError = signal<string | null>(null);
  readonly today = new Date();
  readonly marks = signal<Record<number, string | null>>({});
  readonly savingAttendance = signal(false);

  readonly minutesUploading = signal(false);

  // Object URLs for the minutes that are images, keyed by file id, so a thumbnail (and a "view" action) can be
  // shown alongside the name instead of every attachment reading as the same plain text row.
  private readonly thumbUrls = new Map<number, string>();
  readonly minutesThumbs = signal<Record<number, string>>({});

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => this.load(Number(p.get('id'))));
    this.destroyRef.onDestroy(() => this.clearThumbs());
  }

  private clearThumbs(): void {
    this.thumbUrls.forEach((url) => URL.revokeObjectURL(url));
    this.thumbUrls.clear();
    this.minutesThumbs.set({});
  }

  private loadThumbs(minutes: FileEntry[]): void {
    this.clearThumbs();
    for (const f of minutes) {
      if (f.contentType?.startsWith('image/')) {
        this.meetingsService.downloadFile(f.id).subscribe((blob) => {
          const url = URL.createObjectURL(blob);
          this.thumbUrls.set(f.id, url);
          this.minutesThumbs.update((t) => ({ ...t, [f.id]: url }));
        });
      }
    }
  }

  viewFile(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  private load(id: number): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.meetingsService.meeting(id).subscribe({
      next: (m) => {
        this.meeting.set(m);
        this.heldOn.setValue(parseDate(m.heldOn));
        this.place.setValue(m.place ?? '');
        this.agenda.setValue(m.agenda ?? '');
        this.attendanceNote.setValue(m.attendanceNote ?? '');
        this.membersPresent.setValue(m.membersPresent);
        const marks: Record<number, string | null> = {};
        m.attendance.forEach((a) => (marks[a.personId] = a.status));
        this.marks.set(marks);
        this.loading.set(false);
        this.loadThumbs(m.minutes);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  bodyName(m: Meeting): string {
    if (m.committeeCode) {
      return BUILT_IN_COMMITTEE_CODES.includes(m.committeeCode)
        ? `governanceRegister.committee.${m.committeeCode}`
        : m.committeeName || m.committeeCode;
    }
    return m.committeeName || 'meetings.GeneralMeeting';
  }

  mark(personId: number, status: string | null): void {
    this.marks.update((m) => ({ ...m, [personId]: status }));
  }

  saveDetails(): void {
    const m = this.meeting();
    if (!m) {
      return;
    }
    this.savingDetails.set(true);
    this.detailsError.set(null);
    this.meetingsService
      .update(m.id, {
        heldOn: isoDate(this.heldOn.value),
        place: this.place.value?.trim() || null,
        agenda: this.agenda.value?.trim() || null,
        attendanceNote: this.attendanceNote.value?.trim() || null,
        membersPresent: m.committeeId ? undefined : this.membersPresent.value
      })
      .subscribe({
        next: (updated) => {
          this.meeting.set(updated);
          this.heldOn.setValue(parseDate(updated.heldOn));
          this.savingDetails.set(false);
        },
        error: (e) => {
          this.savingDetails.set(false);
          this.detailsError.set(e?.error?.defaultUserMessage || e?.error?.errors?.[0]?.defaultUserMessage || null);
        }
      });
  }

  saveAttendance(): void {
    const m = this.meeting();
    if (!m) {
      return;
    }
    const attendance = Object.entries(this.marks()).map(
      ([
        personId,
        status
      ]) => ({ personId: Number(personId), status })
    );
    this.savingAttendance.set(true);
    this.meetingsService.update(m.id, { attendance }).subscribe({
      next: (updated) => {
        this.meeting.set(updated);
        const marks: Record<number, string | null> = {};
        updated.attendance.forEach((a) => (marks[a.personId] = a.status));
        this.marks.set(marks);
        this.savingAttendance.set(false);
      },
      error: () => this.savingAttendance.set(false)
    });
  }

  addDecision(): void {
    const m = this.meeting();
    if (!m) {
      return;
    }
    this.dialog
      .open<DecisionDialogComponent, DecisionDialogData, Meeting>(DecisionDialogComponent, {
        data: { meetingId: m.id },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.meeting.set(updated));
  }

  editDecision(d: Decision): void {
    const m = this.meeting();
    if (!m) {
      return;
    }
    this.dialog
      .open<DecisionDialogComponent, DecisionDialogData, Meeting>(DecisionDialogComponent, {
        data: { meetingId: m.id, decision: d },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.meeting.set(updated));
  }

  voidDecision(d: Decision): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'meetings.VoidDecisionTitle',
          message: d.subject,
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'governanceRegister.committees.MarkAsAMistake',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r?.reason) {
          this.meetingsService.voidDecision(d.id, r.reason).subscribe((updated) => this.meeting.set(updated));
        }
      });
  }

  uploadMinutes(event: Event): void {
    const m = this.meeting();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!m || !file) {
      return;
    }
    this.minutesUploading.set(true);
    this.meetingsService.addMinutes(m.id, file).subscribe({
      next: (updated) => {
        this.meeting.set(updated);
        this.loadThumbs(updated.minutes);
        this.minutesUploading.set(false);
        input.value = '';
      },
      error: () => {
        this.minutesUploading.set(false);
        input.value = '';
      }
    });
  }

  downloadFile(id: number, name: string): void {
    this.meetingsService.downloadFile(id).subscribe((blob) => saveBlob(blob, name));
  }

  approve(): void {
    const m = this.meeting();
    if (!m) {
      return;
    }
    this.dialog
      .open<ApproveMeetingDialogComponent, ApproveMeetingDialogData, Meeting>(ApproveMeetingDialogComponent, {
        data: { meetingId: m.id, heldOn: m.heldOn },
        width: '480px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.meeting.set(updated));
  }

  voidMeeting(): void {
    const m = this.meeting();
    if (!m) {
      return;
    }
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'meetings.VoidMeetingTitle',
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'governanceRegister.committees.MarkAsAMistake',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r?.reason) {
          this.meetingsService.void(m.id, r.reason).subscribe((updated) => this.meeting.set(updated));
        }
      });
  }

  addCorrection(): void {
    const m = this.meeting();
    if (!m) {
      return;
    }
    this.dialog
      .open<CorrectionDialogComponent, CorrectionDialogData, Meeting>(CorrectionDialogComponent, {
        data: { meetingId: m.id, decisions: m.decisions },
        width: '520px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.meeting.set(updated));
  }
}
