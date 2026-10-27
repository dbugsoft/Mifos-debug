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

import { ManagementReportsService } from '../../management-reports.service';
import { Report } from '../../management-reports.models';
import { ApproveDialogComponent, ApproveDialogData } from './approve-dialog.component';

describe('ApproveDialogComponent', () => {
  let fixture: ComponentFixture<ApproveDialogComponent>;
  let component: ApproveDialogComponent;
  let reportsService: { approve: jest.Mock; returnReport: jest.Mock };
  let dialogRef: { close: jest.Mock };

  const report = { id: 3, officeId: 1 } as Report;

  const create = async (data: ApproveDialogData) => {
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
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ManagementReportsService, useValue: reportsService }
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

  it('sends the real numeric decisionId the backend requires, on approve', async () => {
    await create({ report, action: 'approve' });
    component.form.controls.decisionId.setValue(41);
    component.form.controls.note.setValue('Approved unanimously');
    component.save();

    expect(reportsService.approve).toHaveBeenCalledWith(3, 41, 'Approved unanimously');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 3, officeId: 1, status: 'APPROVED' });
  });

  it('calls returnReport, not approve, when returning', async () => {
    await create({ report, action: 'return' });
    component.form.controls.decisionId.setValue(41);
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
    component.form.controls.decisionId.setValue(99);
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.busy()).toBe(false);
    expect(component.form.controls.decisionId.getError('server')).toBe("This decision is not the board's.");
  });
});
