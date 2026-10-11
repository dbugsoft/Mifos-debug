/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoopDocumentsComponent } from './coop-documents.component';

describe('CoopDocumentsComponent', () => {
  let component: CoopDocumentsComponent;
  let fixture: ComponentFixture<CoopDocumentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoopDocumentsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CoopDocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
