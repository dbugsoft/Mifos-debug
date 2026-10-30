/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Meetings, minutes and decisions (fineract-dbug #141, ADR-0053; docs/governance-meetings.md): the meetings of the
 * general meeting and of every committee, who attended, the decisions taken, and the signed minutes.
 */

export const MEETING_KINDS = [
  'ANNUAL_GENERAL',
  'SPECIAL_GENERAL',
  'COMMITTEE'
];

export const ATTENDANCE_STATUSES = [
  'PRESENT',
  'ABSENT',
  'ON_LEAVE'
];

export const MEETING_STATUSES = [
  'DRAFT',
  'APPROVED',
  'VOIDED'
];

export interface Attendance {
  personId: number;
  name: string;
  positionCode: string;
  positionName: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | null;
}

export interface FileEntry {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  addedOn: string;
  addedBy: string;
}

export interface Correction {
  id: number;
  meetingId: number;
  decisionId: number | null;
  decisionNumber: number | null;
  correction: string;
  fileId: number | null;
  fileName: string | null;
  addedOn: string;
  addedBy: string;
}

export interface Decision {
  id: number;
  meetingId: number;
  meetingKind: string;
  heldOn: string;
  committeeId: number | null;
  committeeCode: string | null;
  bodyName: string;
  fiscalYear: number;
  fiscalYearLabel: string;
  number: number;
  reference: string;
  subject: string;
  wording: string;
  meetingStatus: string;
  voided: boolean;
  voidReason: string | null;
  recordedBy: string;
  corrections: Correction[];
}

/** A meeting in the list: newest first, without attendance/decisions/minutes/corrections. */
export interface MeetingSummary {
  id: number;
  kind: string;
  committeeId: number | null;
  committeeCode: string | null;
  committeeName: string | null;
  heldOn: string;
  fiscalYear: number;
  fiscalYearLabel: string;
  place: string | null;
  agenda: string | null;
  membersPresent: number | null;
  attendanceNote: string | null;
  status: string;
  approvedOn: string | null;
  approvedBy: string | null;
  recordedBy: string;
  changedBy: string;
  voidReason: string | null;
  decisionCount: number;
  hasMinutes: boolean;
}

export interface Meeting extends MeetingSummary {
  attendance: Attendance[];
  decisions: Decision[];
  minutes: FileEntry[];
  corrections: Correction[];
}

export interface MeetingsApiErrorDetail {
  parameterName?: string;
  defaultUserMessage?: string;
}
