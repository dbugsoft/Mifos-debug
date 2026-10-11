/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoopAdminDetailComponent } from './coop-admin-detail.component';

describe('CoopAdminDetailComponent', () => {
  let component: CoopAdminDetailComponent;
  let fixture: ComponentFixture<CoopAdminDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoopAdminDetailComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CoopAdminDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
