/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SettingsChange } from '../compliance.models';

export interface SentCounts {
  sent: number;
  onTime: number;
  late: number;
}

/** What the Department's inspector asks for, for one period (fineract-dbug ADR-0065, docs/compliance-inspection-pack.md). */
export interface InspectionPack {
  from: string;
  to: string;
  madeOn: string;
  madeBy: string;
  officers: {
    name: string;
    username?: string;
    appointedOn: string;
    boardDecision?: string;
    endedOn?: string;
    notifiedFiuOn?: string;
    notifiedDepartmentOn?: string;
  }[];
  covers: { name: string; fromOn: string; lastDay: string; boardDecision?: string }[];
  boardReviews: { metOn: string; periodFrom: string; periodTo: string; minuteReference?: string }[];
  nextReviewDueOn?: string;
  fiscalYears: number[];
  actionPlans: { fiscalYear: number; approvedOn?: string; boardDecision?: string }[];
  yearlyReports: { fiscalYear: number; type: string; status: string; approvedOn?: string }[];
  trainings: { heldOn: string; topic: string; audience?: string; attendees?: number; givenBy?: string }[];
  reportsSent: {
    reference: string;
    type: 'TTR' | 'STR' | 'SAR';
    dueOn?: string;
    submittedOn: string;
    onTime: boolean;
    status: string;
    fiuReference?: string;
    filedByHand?: boolean;
  }[];
  sentByType: Record<'TTR' | 'STR' | 'SAR', SentCounts>;
  lateAtEnd: { type: string; count: number }[];
  cases: { opened: number; decidedReport: number; decidedNoReport: number; openAtEnd: number };
  riskGradesToday: Record<string, number>;
  settingsChanges: SettingsChange[];
  accessHolders: {
    userId: number;
    username: string;
    name: string;
    office: string;
    roles: string[];
    permissions: string[];
  }[];
}

@Injectable({ providedIn: 'root' })
export class InspectionPackService {
  private http = inject(HttpClient);

  pack(from: string, to: string): Observable<InspectionPack> {
    return this.http.get<InspectionPack>('/nepal/aml/inspection-pack', { params: { from, to } });
  }
}

/** A fiscal year as people write it: 2082 is 2082/83. */
export function fiscalYearLabel(year: number): string {
  return year + '/' + String((year + 1) % 100).padStart(2, '0');
}
