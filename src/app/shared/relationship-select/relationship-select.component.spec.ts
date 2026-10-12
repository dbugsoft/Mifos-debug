/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  RelatedPersonRelationships,
  RelationshipSelectComponent,
  relationshipText
} from './relationship-select.component';

const words: Record<string, string> = { 'relationship.UNCLE': 'काका वा मामा' };
const translate = { instant: (key: string) => words[key] ?? key } as unknown as TranslateService;

describe('relationshipText', () => {
  it('translates a code, adds the description, and keeps text typed before the list', () => {
    expect(relationshipText(translate, 'UNCLE', null, 'Uncle', 'Uncle')).toBe('काका वा मामा');
    expect(relationshipText(translate, 'OTHER', 'business partner', null, 'Other')).toBe('Other: business partner');
    expect(relationshipText(translate, null, null, 'mama', null)).toBe('mama');
  });
});

describe('RelationshipSelectComponent', () => {
  it('drops the description when the choice no longer needs one', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translate },
        {
          provide: RelatedPersonRelationships,
          useValue: {
            list$: of([
              { code: 'UNCLE', labelEn: 'Uncle', needsDetail: false },
              { code: 'OTHER', labelEn: 'Other', needsDetail: true }
            ])
          }
        }
      ]
    });
    const select = TestBed.runInInjectionContext(() => new RelationshipSelectComponent());
    select.code = new FormControl<string | null>('OTHER');
    select.detail = new FormControl<string | null>('business partner');
    select.ngOnInit();
    expect(select.chosen()?.needsDetail).toBe(true);
    expect(select.detail.value).toBe('business partner');

    select.code.setValue('UNCLE');
    expect(select.chosen()?.needsDetail).toBe(false);
    expect(select.detail.value).toBeNull();
  });
});
