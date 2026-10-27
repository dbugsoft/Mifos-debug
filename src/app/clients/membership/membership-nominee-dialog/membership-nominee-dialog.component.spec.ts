/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { MembershipService } from '../membership.service';
import { MemberNominee } from '../membership.models';
import { MembershipNomineeDialogComponent } from './membership-nominee-dialog.component';

const typedBefore: MemberNominee = {
  clientId: 11,
  accountNo: '000000011',
  name: 'Sita Thapa',
  canChange: true,
  nominee: { name: 'Hari Thapa', relationship: 'buwa', mobileNo: '9800000001' },
  previous: []
};

function setUp(changeNominee: jest.Mock) {
  const close = jest.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: typedBefore },
      { provide: MatDialogRef, useValue: { close } },
      { provide: MembershipService, useValue: { changeNominee, nomineeRelationships: () => of([]) } }
    ]
  });
  return { dialog: TestBed.runInInjectionContext(() => new MembershipNomineeDialogComponent()), close };
}

describe('MembershipNomineeDialogComponent', () => {
  it('sends the text typed before the list back unchanged, or the code once one is chosen', () => {
    const changeNominee = jest.fn(() => of(typedBefore));
    const { dialog, close } = setUp(changeNominee);
    expect(dialog.typed).toBe('buwa');

    dialog.form.controls.mobileNo.setValue('9811111111');
    dialog.save();
    expect(changeNominee).toHaveBeenLastCalledWith(
      11,
      { name: 'Hari Thapa', relationship: 'buwa', mobileNo: '9811111111' },
      undefined
    );
    expect(close).toHaveBeenCalledWith(typedBefore);

    dialog.busy.set(false); // the real dialog has closed by now
    dialog.form.controls.relationshipCode.setValue('FATHER');
    dialog.form.controls.note.setValue(' Member asked in person ');
    dialog.save();
    expect(changeNominee).toHaveBeenLastCalledWith(
      11,
      { name: 'Hari Thapa', relationshipCode: 'FATHER', mobileNo: '9811111111' },
      'Member asked in person'
    );
  });

  it('puts a refused field on its control', () => {
    const refused = {
      status: 400,
      error: { errors: [{ parameterName: 'nominee.relationshipDetail', defaultUserMessage: 'Say what kind' }] }
    };
    const { dialog } = setUp(jest.fn(() => throwError(() => refused)));
    dialog.save();
    expect(dialog.form.controls.relationshipDetail.getError('server')).toBe('Say what kind');
    expect(dialog.busy()).toBe(false);
  });
});
