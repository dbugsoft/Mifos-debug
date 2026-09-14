/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, ValidatorFn } from '@angular/forms';

export interface PasswordRule {
  /** Error key produced by passwordValidator() when this rule is broken. */
  key: string;
  /** Translation key for the rule's label. */
  labelKey: string;
  params?: Record<string, unknown>;
  met: boolean;
}

const RULES: ReadonlyArray<Pick<PasswordRule, 'key' | 'labelKey'>> = [
  { key: 'minLength', labelKey: 'labels.text.Password rule min length' },
  { key: 'maxLength', labelKey: 'labels.text.Password rule max length' },
  { key: 'uppercase', labelKey: 'labels.text.Password rule uppercase' },
  { key: 'lowercase', labelKey: 'labels.text.Password rule lowercase' },
  { key: 'number', labelKey: 'labels.text.Password rule number' },
  { key: 'specialChar', labelKey: 'labels.text.Password rule special character' },
  { key: 'spaces', labelKey: 'labels.text.Password rule no spaces' },
  { key: 'repeated', labelKey: 'labels.text.Password rule no repeats' }
];

/**
 * A live checklist derived from the very validator the form uses, so the
 * rules shown to the user cannot drift from the rules that are enforced.
 * Nothing is marked as met while the field is still empty.
 */
export function passwordRuleChecklist(
  value: string | null | undefined,
  minLength: number,
  validate: ValidatorFn
): PasswordRule[] {
  const errors = value ? (validate({ value } as AbstractControl) ?? {}) : null;

  return RULES.map((rule) => ({
    ...rule,
    params: rule.key === 'minLength' ? { min: minLength } : undefined,
    met: errors !== null && !errors[rule.key]
  }));
}
