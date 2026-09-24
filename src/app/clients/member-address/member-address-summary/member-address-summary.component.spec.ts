/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { mockAddress } from '../testing/nepal-locations.mock';
import { MemberAddressSummaryComponent } from './member-address-summary.component';

describe('MemberAddressSummaryComponent', () => {
  let fixture: ComponentFixture<MemberAddressSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MemberAddressSummaryComponent,
        TranslateModule.forRoot()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(MemberAddressSummaryComponent);
  });

  const render = (overrides = {}) => {
    fixture.componentRef.setInput('address', mockAddress(overrides));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('writes the place smallest first, with the Nepali line underneath', () => {
    const element = render({ houseNumber: '12/4' });

    expect(element.querySelector('.place')?.textContent).toBe(
      'Kathmandu Metropolitan City-16, Kathmandu, Bagmati Province'
    );
    expect(element.querySelector('.place-other')?.textContent).toBe(
      'काठमाडौं महानगरपालिका-१६, काठमाडौं, बागमती प्रदेश'
    );
    expect(element.querySelector('.street')?.textContent).toContain('Naxal');
    expect(element.querySelector('.house')).not.toBeNull();
    expect(element.querySelector('.notice')).toBeNull();
  });

  it('writes Nepali first when the app is in Nepali', () => {
    TestBed.inject(TranslateService).use('ne-NE');
    const element = render();

    expect(element.querySelector('.place')?.textContent).toBe('काठमाडौं महानगरपालिका-१६, काठमाडौं, बागमती प्रदेश');
    expect(element.querySelector('.place-other')?.getAttribute('lang')).toBe('en');
  });

  it('leaves out an empty street line and flags a merged local level', () => {
    const element = render({ tole: '  ', houseNumber: null, localLevelActive: false });

    expect(element.querySelector('.street')).toBeNull();
    expect(element.querySelector('.notice')).not.toBeNull();
  });

  it('trims stray spaces from place names', () => {
    const element = render({ districtNameNp: 'काठमाडौँ ', provinceNameEn: ' Bagmati ' });
    expect(element.querySelector('.place')?.textContent).toBe('Kathmandu Metropolitan City-16, Kathmandu, Bagmati');
    expect(element.querySelector('.place-other')?.textContent).toBe(
      'काठमाडौं महानगरपालिका-१६, काठमाडौँ, बागमती प्रदेश'
    );
  });

  it('shows only the English line when there is no Nepali name', () => {
    const element = render({ provinceNameNp: '', districtNameNp: '', localLevelNameNp: '' });
    expect(element.querySelector('.place-other')).toBeNull();
  });
});
