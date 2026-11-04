/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { MeetingsService } from 'app/governance-register/meetings/meetings.service';
import { ElectionsService } from '../../elections.service';
import { Election, Nomination } from '../../elections.models';
import { ResultsDialogComponent, ResultsDialogData } from './results-dialog.component';

describe('ResultsDialogComponent', () => {
  let fixture: ComponentFixture<ResultsDialogComponent>;
  let component: ResultsDialogComponent;
  let electionsService: { declare: jest.Mock };
  let meetingsService: { meetings: jest.Mock };
  let dialogRef: { close: jest.Mock };

  const nomination = (overrides: Partial<Nomination> = {}): Nomination => ({
    id: 1,
    clientId: 11,
    accountNo: 'AC-11',
    name: 'Sita Thapa',
    committeeId: 1,
    committeeCode: 'BOARD',
    committeeName: 'Board',
    positionId: 2,
    positionCode: 'MEMBER',
    positionName: 'Member',
    nominatedOn: '2026-10-20',
    proposedBy: null,
    status: 'ACCEPTED',
    problems: [],
    warnings: [],
    checkedOn: '2026-10-20',
    votes: null,
    elected: null,
    termId: null,
    withdrawReason: null,
    recordedBy: 'admin',
    ...overrides
  });

  const election = (nominations: Nomination[]): Election => ({
    id: 9,
    title: 'Board election 2083',
    status: 'LIST_PUBLISHED',
    electionOn: '2026-11-10',
    cutOffOn: '2026-10-25',
    minMembershipMonths: 12,
    calledByDecisionId: null,
    calledByDecision: null,
    note: null,
    committees: [{ id: 1, code: 'BOARD', name: 'Board' }],
    votersIncluded: 100,
    votersLeftOut: 5,
    meetingId: null,
    meetingHeldOn: null,
    resultDecisionId: null,
    resultDecision: null,
    termsStartOn: null,
    recordedBy: 'admin',
    rollFrozenOn: '2026-10-25',
    listPublishedOn: '2026-10-26',
    declaredOn: null,
    cancelReason: null,
    electionCommittee: [],
    staffNotLinked: 0,
    nominations
  });

  const create = async (data: ResultsDialogData, meetings: unknown[] = []) => {
    electionsService = { declare: jest.fn(() => of({ ...data.election, status: 'DECLARED' })) };
    meetingsService = { meetings: jest.fn(() => of(meetings)) };
    dialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [
        ResultsDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ElectionsService, useValue: electionsService },
        { provide: MeetingsService, useValue: meetingsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('lists only ACCEPTED nominations - refused and withdrawn candidates are left out', async () => {
    await create({
      election: election([
        nomination({ id: 1, status: 'ACCEPTED' }),
        nomination({ id: 2, status: 'REFUSED', name: 'Hari Gurung' }),
        nomination({ id: 3, status: 'WITHDRAWN', name: 'Ram Rai' })
      ])
    });
    expect(component.rows.map((r) => r.nomination.id)).toEqual([1]);
  });

  it('omits votes from the payload when left empty, and sends decisionId only when picked', async () => {
    await create({ election: election([nomination({ id: 1 })]) });
    component.pickMeeting({ id: 4, kind: 'ANNUAL_GENERAL', heldOn: '2026-11-01', status: 'APPROVED' } as never);
    component.termsStartOn.setValue(new Date(2026, 10, 2));
    component.rows[0].elected.setValue(true);
    // votes left empty on purpose

    component.confirm();

    expect(electionsService.declare).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        meetingId: 4,
        termsStartOn: '2026-11-02',
        results: [{ nominationId: 1, elected: true }]
      })
    );
    const sentBody = electionsService.declare.mock.calls[0][1];
    expect(sentBody.decisionId).toBeUndefined();
    expect(sentBody.results[0].votes).toBeUndefined();
  });

  it('sends votes when the clerk enters them', async () => {
    await create({ election: election([nomination({ id: 1 })]) });
    component.pickMeeting({ id: 4, kind: 'ANNUAL_GENERAL', heldOn: '2026-11-01', status: 'APPROVED' } as never);
    component.rows[0].votes.setValue(42);
    component.rows[0].elected.setValue(true);

    component.confirm();

    expect(electionsService.declare).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ results: [{ nominationId: 1, votes: 42, elected: true }] })
    );
  });

  it('closes the dialog with the declared election on success', async () => {
    await create({ election: election([nomination({ id: 1 })]) });
    component.pickMeeting({ id: 4, kind: 'ANNUAL_GENERAL', heldOn: '2026-11-01', status: 'APPROVED' } as never);
    component.confirm();
    expect(dialogRef.close).toHaveBeenCalledWith(expect.objectContaining({ status: 'DECLARED' }));
  });

  it('will not advance past the form step when there are no accepted candidates to declare for', async () => {
    await create({ election: election([nomination({ id: 1, status: 'REFUSED' })]) });
    component.pickMeeting({ id: 4, kind: 'ANNUAL_GENERAL', heldOn: '2026-11-01', status: 'APPROVED' } as never);
    expect(component.formValid).toBe(false);
    component.next();
    expect(component.step()).toBe('form');
    expect(electionsService.declare).not.toHaveBeenCalled();
  });

  it('will not advance to the confirm step, or call the API, unless somebody is marked elected', async () => {
    await create({ election: election([nomination({ id: 1 })]) });
    component.pickMeeting({ id: 4, kind: 'ANNUAL_GENERAL', heldOn: '2026-11-01', status: 'APPROVED' } as never);
    // formValid only checks the meeting/date/candidate-list, not who is ticked - this is what used to let an
    // empty { results: [] } reach the server, instead of being caught here first.
    expect(component.formValid).toBe(true);

    component.next();

    expect(component.step()).toBe('form');
    expect(component.serverError()).toBeTruthy();
    expect(electionsService.declare).not.toHaveBeenCalled();
  });

  it('advances to the confirm step once a candidate is marked elected', async () => {
    await create({ election: election([nomination({ id: 1 })]) });
    component.pickMeeting({ id: 4, kind: 'ANNUAL_GENERAL', heldOn: '2026-11-01', status: 'APPROVED' } as never);
    component.rows[0].elected.setValue(true);

    component.next();

    expect(component.step()).toBe('confirm');
  });

  it('keeps the dialog open and shows the server message on a 400/403 - nothing is saved', async () => {
    await create({ election: election([nomination({ id: 1 })]) });
    electionsService.declare.mockReturnValue(
      throwError(() => ({ error: { defaultUserMessage: 'Two members of the same family cannot both be elected.' } }))
    );
    component.pickMeeting({ id: 4, kind: 'ANNUAL_GENERAL', heldOn: '2026-11-01', status: 'APPROVED' } as never);
    component.confirm();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.serverError()).toBe('Two members of the same family cannot both be elected.');
    expect(component.rows[0]).toBeTruthy();
  });
});
