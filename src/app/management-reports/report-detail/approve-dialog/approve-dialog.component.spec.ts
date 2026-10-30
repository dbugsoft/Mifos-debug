/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { GovernanceRegisterService } from 'app/governance-register/governance-register.service';
import { MeetingsService } from 'app/governance-register/meetings/meetings.service';
import { ManagementReportsService } from '../../management-reports.service';
import { Report } from '../../management-reports.models';
import { ApproveDialogComponent, ApproveDialogData } from './approve-dialog.component';

describe('ApproveDialogComponent', () => {
  let fixture: ComponentFixture<ApproveDialogComponent>;
  let component: ApproveDialogComponent;
  let reportsService: { approve: jest.Mock; returnReport: jest.Mock };
  let governanceService: { committees: jest.Mock };
  let meetingsService: { decisions: jest.Mock };
  let dialogRef: { close: jest.Mock };

  const report = { id: 3, officeId: 1, to: '2083-06-30' } as Report;

  const create = async (
    data: ApproveDialogData,
    committees: { id: number; kind: string }[] = [{ id: 7, kind: 'BOARD' }],
    decisions: unknown[] = []
  ) => {
    reportsService = {
      approve: jest.fn(() => of({ ...report, status: 'APPROVED' })),
      returnReport: jest.fn(() => of({ ...report, status: 'RETURNED' }))
    };
    governanceService = { committees: jest.fn(() => of(committees)) };
    meetingsService = { decisions: jest.fn(() => of(decisions)) };
    dialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [
        ApproveDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ManagementReportsService, useValue: reportsService },
        { provide: GovernanceRegisterService, useValue: governanceService },
        { provide: MeetingsService, useValue: meetingsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ApproveDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('will not submit without a decision id - no free-text substitute is accepted', async () => {
    await create({ report, action: 'approve' });
    component.save();
    expect(reportsService.approve).not.toHaveBeenCalled();
    expect(component.form.controls.decisionId.invalid).toBe(true);
  });

  it('sends the decisionId of the picked decision, on approve', async () => {
    await create({ report, action: 'approve' });
    component.pickDecision({ id: 41, number: 5, subject: 'Budget', heldOn: '2083-07-01' } as never);
    component.form.controls.note.setValue('Approved unanimously');
    component.save();

    expect(reportsService.approve).toHaveBeenCalledWith(3, 41, 'Approved unanimously');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 3, officeId: 1, to: '2083-06-30', status: 'APPROVED' });
  });

  it('calls returnReport, not approve, when returning', async () => {
    await create({ report, action: 'return' });
    component.pickDecision({ id: 41, number: 5, subject: 'Budget', heldOn: '2083-07-01' } as never);
    component.save();

    expect(reportsService.returnReport).toHaveBeenCalledWith(3, 41, null);
    expect(reportsService.approve).not.toHaveBeenCalled();
  });

  it('shows the server message and keeps the dialog open when the decision cannot be used', async () => {
    await create({ report, action: 'approve' });
    reportsService.approve.mockReturnValue(
      throwError(() => ({
        error: { errors: [{ parameterName: 'decisionId', defaultUserMessage: "This decision is not the board's." }] }
      }))
    );
    component.pickDecision({ id: 99, number: 1, subject: 'X', heldOn: '2083-07-01' } as never);
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.busy()).toBe(false);
    expect(component.form.controls.decisionId.getError('server')).toBe("This decision is not the board's.");
  });

  it('looks up decisions under the board committee, found from kind === BOARD', async () => {
    await create({ report, action: 'approve' }, [
      { id: 4, kind: 'ACCOUNTS_SUPERVISION' },
      { id: 7, kind: 'BOARD' }
    ]);
    expect(component.boardCommitteeId()).toBe(7);
  });

  it('filters out decisions held before the period ends, on the client', async () => {
    await create({ report, action: 'approve' }, undefined, [
      { id: 1, number: 1, subject: 'Too early', heldOn: '2083-06-29' },
      { id: 2, number: 2, subject: 'On time', heldOn: '2083-06-30' },
      { id: 3, number: 3, subject: 'Later', heldOn: '2083-07-15' }
    ]);
    component.decisionSearch.setValue('bu');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(component.foundDecisions().map((d) => d.id)).toEqual([
      2,
      3
    ]);
  });

  it('flags a 403 from the governance APIs as a permission problem, not a crash', async () => {
    governanceService = { committees: jest.fn(() => throwError(() => ({ status: 403 }))) };
    meetingsService = { decisions: jest.fn(() => of([])) };
    reportsService = {
      approve: jest.fn(() => of({ ...report, status: 'APPROVED' })),
      returnReport: jest.fn(() => of({ ...report, status: 'RETURNED' }))
    };
    dialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [
        ApproveDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { report, action: 'approve' } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ManagementReportsService, useValue: reportsService },
        { provide: GovernanceRegisterService, useValue: governanceService },
        { provide: MeetingsService, useValue: meetingsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ApproveDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.decisionsForbidden()).toBe(true);
  });
});
