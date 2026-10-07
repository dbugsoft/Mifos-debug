/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { DueChipComponent } from './due-chip.component';

describe('DueChipComponent', () => {
  function chip(daysLeft: number | null) {
    TestBed.configureTestingModule({ imports: [DueChipComponent, TranslateModule.forRoot()] });
    const fixture = TestBed.createComponent(DueChipComponent);
    fixture.componentRef.setInput('daysLeft', daysLeft);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('says a late report is late, in red', () => {
    const c = chip(-4);
    expect(c.tone()).toBe('chip red');
    expect(c.label()).toBe('compliance.Days late');
    expect(c.days()).toBe(4);
  });

  it('warns three days ahead, in amber', () => {
    expect(chip(3).tone()).toBe('chip amber');
    expect(chip(0).label()).toBe('compliance.Due today');
  });

  it('is quiet further out', () => {
    const c = chip(10);
    expect(c.tone()).toBe('chip grey');
    expect(c.label()).toBe('compliance.Due in days');
  });

  it('shows no deadline when there is none', () => {
    expect(chip(null).label()).toBe('compliance.No deadline');
  });
});
