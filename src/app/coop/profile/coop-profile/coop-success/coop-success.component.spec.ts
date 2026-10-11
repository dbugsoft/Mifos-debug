/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoopSuccessComponent } from './coop-success.component';

describe('CoopSuccessComponent', () => {
  let component: CoopSuccessComponent;
  let fixture: ComponentFixture<CoopSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoopSuccessComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CoopSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
