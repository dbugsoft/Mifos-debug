/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect } from '@jest/globals';
import { cloneDeep } from 'lodash';
import { policyChanges } from './lending-policy.service';

const before = {
  fileRequiredForApproval: false,
  documents: [
    { code: 'APPLICATION_FORM', label: 'Form', appliesTo: ['ANY'], required: true },
    { code: 'TRACE_MAP', label: 'Map', appliesTo: ['LAND'], required: true }
  ],
  valuation: { marginPercent: 30 }
};

describe('policyChanges', () => {
  it('lists nothing for the same policy', () => {
    expect(policyChanges(before, cloneDeep(before))).toEqual([]);
  });

  it('names a switch turned on, an item added and an edited field by code, without the order', () => {
    const after = cloneDeep(before);
    after.fileRequiredForApproval = true;
    after.documents.push({ code: 'OWN_ITEM', label: 'Own', appliesTo: ['ANY'], required: false });
    after.documents[1].required = false;

    expect(policyChanges(before, after)).toEqual([
      'fileRequiredForApproval: false → true',
      'documents › TRACE_MAP › required: true → false',
      'documents › OWN_ITEM › label: — → Own',
      'documents › OWN_ITEM › appliesTo: — → ANY',
      'documents › OWN_ITEM › required: — → false'
    ]);
  });

  it('names a pure reorder, and reads a left-out field as null', () => {
    const after = cloneDeep(before);
    after.documents.reverse();
    const withNull = { ...after, valuation: { marginPercent: 30, holdUpTo: null as number | null } };

    expect(policyChanges(before, withNull)).toEqual([
      'documents › order: APPLICATION_FORM, TRACE_MAP → TRACE_MAP, APPLICATION_FORM'
    ]);
  });
});
