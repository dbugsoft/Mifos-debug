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

import { GovernanceRegisterService } from '../../governance-register.service';
import { Position } from '../../governance-register.models';
import { PositionDialogComponent, PositionDialogData } from './position-dialog.component';

describe('PositionDialogComponent', () => {
  let fixture: ComponentFixture<PositionDialogComponent>;
  let component: PositionDialogComponent;
  let governance: { createPosition: jest.Mock; updatePosition: jest.Mock };
  let dialogRef: { close: jest.Mock };

  const ownPosition: Position = {
    id: 9,
    code: 'OWN_9',
    name: 'Adviser',
    singleHolder: false,
    memberRequired: true,
    builtIn: false,
    active: true
  };

  const builtInPosition: Position = {
    id: 1,
    code: 'CHAIR',
    name: 'Chairperson',
    singleHolder: true,
    memberRequired: true,
    builtIn: true,
    active: true
  };

  const create = async (data: PositionDialogData) => {
    governance = {
      createPosition: jest.fn(() => of(ownPosition)),
      updatePosition: jest.fn(() => of(ownPosition))
    };
    dialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [
        PositionDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: GovernanceRegisterService, useValue: governance }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PositionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('adds a new position with the fields a creation accepts', async () => {
    await create({});
    component.form.controls.name.setValue('Adviser');
    component.form.controls.singleHolder.setValue(true);
    component.form.controls.memberRequired.setValue(false);
    component.save();

    expect(governance.createPosition).toHaveBeenCalledWith({
      name: 'Adviser',
      singleHolder: true,
      memberRequired: false
    });
    expect(dialogRef.close).toHaveBeenCalledWith(ownPosition);
  });

  it('does not submit an empty name', async () => {
    await create({});
    component.save();
    expect(governance.createPosition).not.toHaveBeenCalled();
    expect(component.form.controls.name.invalid).toBe(true);
  });

  it('changes the name and active flag of a position the cooperative added', async () => {
    await create({ position: ownPosition });
    component.form.controls.name.setValue('Senior adviser');
    component.form.controls.active.setValue(false);
    component.save();

    expect(governance.updatePosition).toHaveBeenCalledWith(9, { name: 'Senior adviser', active: false });
  });

  it('never sends a name change for a built-in position', async () => {
    await create({ position: builtInPosition });
    expect(component.isOwn).toBe(false);
    component.form.controls.active.setValue(false);
    component.save();

    expect(governance.updatePosition).toHaveBeenCalledWith(1, { active: false });
  });

  it('shows the server message and keeps the dialog open when saving fails', async () => {
    await create({});
    governance.createPosition.mockReturnValue(
      throwError(() => ({
        error: {
          errors: [{ parameterName: 'name', defaultUserMessage: 'There is already a position called Adviser.' }]
        }
      }))
    );
    component.form.controls.name.setValue('Adviser');
    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.busy()).toBe(false);
    expect(component.form.controls.name.getError('server')).toBe('There is already a position called Adviser.');
  });
});
