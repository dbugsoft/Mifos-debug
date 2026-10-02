/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { createHash } from 'crypto';

import { BsCalendarService } from './bs-calendar.service';
import { BUNDLED_BS_CALENDAR } from './bs-calendar.data';

/** The checksum the server reports for nepal/bs-calendar.csv (fineract-dbug NepaliDateConverterTest). */
const SERVER_CHECKSUM = '01c9727d3de3a8316f6c5351c114e50c6bc94150139b94c2decdac80bf5e8ea4';

const ymd = (date: Date | null) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : null;

describe('BsCalendarService', () => {
  let service: BsCalendarService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(BsCalendarService);
  });

  it('bundles the same table as the server', () => {
    const t = BUNDLED_BS_CALENDAR;
    const lines = t.monthDays.map((months, i) => `${t.firstYear + i},${months.join(',')}\n`).join('');
    expect(createHash('sha256').update(`${t.firstYear}=${t.firstDayAd}\n${lines}`).digest('hex')).toBe(t.checksum);
    expect(t.checksum).toBe(SERVER_CHECKSUM);
  });

  it('converts known dates both ways', () => {
    const known: [
      string,
      number,
      number,
      number
    ][] = [
      [
        '1921-04-13',
        1978,
        1,
        1
      ],
      [
        '1943-04-14',
        2000,
        1,
        1
      ],
      [
        '1993-10-01',
        2050,
        6,
        15
      ],
      [
        '2005-05-15',
        2062,
        2,
        1
      ],
      [
        '2022-05-26',
        2079,
        2,
        12
      ],
      [
        '2034-04-13',
        2090,
        12,
        30
      ]
    ];
    for (const [
      ad,
      year,
      month,
      day
    ] of known) {
      expect(ymd(service.toAd({ year, month, day }))).toBe(ad);
      expect(service.toBs(ad)).toEqual({ year, month, day });
    }
  });

  it('round-trips every day in the table', () => {
    let ad = service.toAd({ year: service.minYear, month: 1, day: 1 })!;
    for (let year = service.minYear; year <= service.maxYear; year++) {
      for (let month = 1; month <= 12; month++) {
        for (let day = 1; day <= service.daysInMonth(year, month)!; day++) {
          expect(service.toBs(ad)).toEqual({ year, month, day });
          ad = new Date(ad.getFullYear(), ad.getMonth(), ad.getDate() + 1);
        }
      }
    }
  });

  it('leaves dates outside the table unconverted', () => {
    expect(service.toBs('1921-04-12')).toBeNull();
    expect(service.toBs('2034-04-14')).toBeNull();
    expect(service.toAd({ year: 2062, month: 2, day: 32 })).toBeNull();
  });

  it('marks years after the published calendar as provisional', () => {
    expect(service.isProvisional(2083)).toBe(false);
    expect(service.isProvisional(2084)).toBe(true);
  });
});
