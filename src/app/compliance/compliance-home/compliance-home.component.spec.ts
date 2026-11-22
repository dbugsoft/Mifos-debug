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
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ComplianceService } from '../compliance.service';
import { ComplianceToday, TodayItem } from '../compliance.models';
import { ComplianceHomeComponent } from './compliance-home.component';

const line = (o: Partial<TodayItem>): TodayItem => ({
  kind: 'TTR',
  action: 'SEND',
  id: 1,
  caseId: null,
  reference: null,
  clientId: 7,
  name: 'Hari Karki',
  accountNo: '000000102',
  office: 'Head office',
  amount: 1050000,
  detail: null,
  count: null,
  dueOn: '2026-11-24',
  daysLeft: 2,
  ...o
});

describe('ComplianceHomeComponent (Today)', () => {
  let fixture: ComponentFixture<ComplianceHomeComponent>;
  let component: ComplianceHomeComponent;

  const create = async (answer: ComplianceToday, permissions = ['READ_AMLCOMPLIANCE']) => {
    const todayAnswer = signal<ComplianceToday | null>(answer);
    const service = {
      todayAnswer,
      loadAccess: jest.fn(() => of({ permissions, showMenu: true, holders: null })),
      loadToday: jest.fn(() => of(answer)),
      settings: jest.fn(() => of({ unclassified: 0 })),
      ledgerStatus: jest.fn(() => of(null))
    };
    await TestBed.configureTestingModule({
      imports: [
        ComplianceHomeComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        DecimalPipe,
        DatePipe,
        { provide: ComplianceService, useValue: service }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ComplianceHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const answer = (items: TodayItem[], more = 0): ComplianceToday => ({
    today: '2026-11-22',
    names: true,
    places: {},
    late: { total: items.filter((i) => i.daysLeft !== null && i.daysLeft < 0).length },
    soon: { total: 0 },
    alerts: { open: 1, highRisk: 0 },
    sentThisMonth: { total: 0 },
    items,
    more
  });

  it('lists every line with what to do and a button', async () => {
    await create(
      answer([
        line({}),
        line({ kind: 'ALERT', action: 'LOOK_INTO', detail: 'R7', dueOn: null, daysLeft: null })
      ])
    );
    const lines = fixture.nativeElement.querySelectorAll('.line');
    expect(lines.length).toBe(2);
    expect(lines[0].textContent).toContain('compliance.today.do.SEND');
    expect(lines[0].textContent).toContain('Hari Karki');
    expect(lines[1].textContent).toContain('compliance.alert.rule.R7');
    expect(lines[1].textContent).toContain('compliance.today.No deadline');
  });

  it('narrows the list to what a tile counts, and back', async () => {
    await create(
      answer([
        line({ daysLeft: -1 }),
        line({ id: 2 })
      ])
    );
    component.toggleFilter('LATE');
    expect(component.lines().length).toBe(1);
    component.toggleFilter('LATE');
    expect(component.lines().length).toBe(2);
  });

  it('opens each kind where it is worked on', async () => {
    await create(answer([]));
    expect(component.link(line({ kind: 'STR', caseId: 9 })).path).toEqual([
      'cases',
      9
    ]);
    expect(component.link(line({ kind: 'MATCH', action: 'DECIDE_MATCH', id: 4 })).path).toEqual([
      'screening',
      'matches',
      4
    ]);
    expect(component.link(line({ kind: 'TTR', action: 'DECIDE_LATE', id: null })).query).toEqual({
      status: 'HISTORICAL'
    });
    expect(component.link(line({ kind: 'YEARLY', id: 2082, detail: 'SCHEDULE_3' })).path).toEqual([
      'reports',
      'SCHEDULE_3',
      2082
    ]);
  });

  it('offers the lines the server left out', async () => {
    await create(answer([line({})], 12));
    expect(component.hidden()).toBe(12);
    expect(fixture.nativeElement.textContent).toContain('compliance.today.Show all');
  });

  it('says so when nothing waits', async () => {
    await create(answer([]));
    expect(fixture.nativeElement.textContent).toContain('compliance.today.Nothing waits');
  });
});
