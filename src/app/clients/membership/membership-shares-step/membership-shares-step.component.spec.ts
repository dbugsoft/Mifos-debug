/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { MembershipService } from '../membership.service';
import { MembershipTemplate, RelationshipOption } from '../membership.models';
import { MembershipSharesStepComponent } from './membership-shares-step.component';

const relationships: RelationshipOption[] = [
  { code: 'FATHER', labelEn: 'Father', needsDetail: false },
  { code: 'GUARDIAN', labelEn: 'Guardian', needsDetail: true }
];

const template = {
  shareProducts: [{ id: 1, name: 'Share', unitPrice: 100, charges: [], hasAccounting: true }],
  savingsProducts: [],
  settings: { nomineeRequired: true, paymentTaken: 'AT_APPROVAL' }
} as unknown as MembershipTemplate;

function setUp(nomineeRelationships = jest.fn(() => of(relationships))): MembershipSharesStepComponent {
  TestBed.configureTestingModule({
    providers: [
      { provide: MembershipService, useValue: { nomineeRelationships } },
      { provide: SettingsService, useValue: { businessDate: new Date() } },
      { provide: Dates, useValue: { formatDate: jest.fn() } },
      { provide: TranslateService, useValue: { instant: (key: string) => key } }
    ]
  });
  const step = TestBed.runInInjectionContext(() => new MembershipSharesStepComponent());
  step.template = template;
  step.ngOnInit();
  return step;
}

describe('MembershipSharesStepComponent nominee relationship', () => {
  it('asks for the detail only when the chosen entry needs it, and clears it on a switch', () => {
    const step = setUp();
    const c = step.form.controls;
    c.nomineeName.setValue('Hari Thapa');
    c.nomineeRelationship.setValue('GUARDIAN');
    expect(c.nomineeRelationshipDetail.hasError('required')).toBe(true);
    expect(step.valid()).toBe(false);

    c.nomineeRelationshipDetail.setValue('uncle');
    expect(step.valid()).toBe(true);
    expect(step.relationshipText()).toBe('Guardian: uncle');
    expect(step.request()?.nominee).toEqual({
      name: 'Hari Thapa',
      relationshipCode: 'GUARDIAN',
      relationshipDetail: 'uncle',
      mobileNo: undefined
    });

    c.nomineeRelationship.setValue('FATHER');
    expect(c.nomineeRelationshipDetail.value).toBe('');
    expect(step.valid()).toBe(true);
    expect(step.request()?.nominee?.relationshipDetail).toBeUndefined();
  });

  it('keeps Next off while the relationship is missing, and retries a failed list', () => {
    const load = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('down')))
      .mockReturnValue(of(relationships));
    const step = setUp(load);
    expect(step.relationshipsState()).toBe('failed');
    step.form.controls.nomineeName.setValue('Hari Thapa');
    expect(step.valid()).toBe(false);

    step.loadRelationships();
    expect(step.relationshipsState()).toBe('loaded');
    expect(step.relationships()).toHaveLength(2);
  });
});
