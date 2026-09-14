/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, ValidationErrors } from '@angular/forms';

import { passwordRuleChecklist } from './password-rules';

describe('passwordRuleChecklist', () => {
  // Stands in for passwordValidator(): reports only the rules this fake value breaks.
  const validate = (control: AbstractControl): ValidationErrors | null =>
    control.value === 'Sahakari#2081Ktm' ? null : { uppercase: 'x', spaces: 'x' };

  it('marks nothing as met while the field is empty', () => {
    expect(passwordRuleChecklist('', 8, validate).every((rule) => !rule.met)).toBe(true);
  });

  it('marks every rule met for a valid password', () => {
    expect(passwordRuleChecklist('Sahakari#2081Ktm', 8, validate).every((rule) => rule.met)).toBe(true);
  });

  it('marks exactly the broken rules as unmet', () => {
    const unmet = passwordRuleChecklist('hamro sahakari', 8, validate)
      .filter((rule) => !rule.met)
      .map((rule) => rule.key);

    expect(unmet).toEqual([
      'uppercase',
      'spaces'
    ]);
  });

  it('passes the minimum length to the label', () => {
    expect(passwordRuleChecklist('x', 12, validate)[0].params).toEqual({ min: 12 });
  });
});
