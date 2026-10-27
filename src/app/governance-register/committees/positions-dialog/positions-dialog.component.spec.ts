/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { GovernanceRegisterService } from '../../governance-register.service';
import { Position } from '../../governance-register.models';
import { PositionsDialogComponent } from './positions-dialog.component';

describe('PositionsDialogComponent', () => {
  let fixture: ComponentFixture<PositionsDialogComponent>;
  let component: PositionsDialogComponent;
  let governance: { positions: jest.Mock };

  const ownPosition: Position = {
    id: 9,
    code: 'OWN_9',
    name: 'Adviser',
    singleHolder: false,
    memberRequired: true,
    builtIn: false,
    active: true
  };

  beforeEach(async () => {
    governance = { positions: jest.fn(() => of([ownPosition])) };

    await TestBed.configureTestingModule({
      imports: [
        PositionsDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: GovernanceRegisterService, useValue: governance },
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions: ['ALL_FUNCTIONS'] }) } },
        { provide: MatDialog, useValue: { open: jest.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PositionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads every position, including inactive ones, by default', () => {
    expect(governance.positions).toHaveBeenCalledWith(true);
    expect(component.positions()).toEqual([ownPosition]);
  });

  it('reloads when "include inactive" is switched off', () => {
    governance.positions.mockClear();
    component.toggleInactive({ checked: false } as any);
    expect(governance.positions).toHaveBeenCalledWith(false);
  });

  it("labels a position of the cooperative's own by its own name, not a translation key", () => {
    expect(component.positionLabel(ownPosition)).toBe('Adviser');
  });

  it('labels a built-in position by its translation code', () => {
    expect(
      component.positionLabel({
        id: 1,
        code: 'CHAIR',
        name: 'Chairperson',
        singleHolder: true,
        memberRequired: true,
        builtIn: true,
        active: true
      })
    ).toBe('governanceRegister.position.CHAIR');
  });
});
