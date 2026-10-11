/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PasswordRenewalService, isPasswordOutdatedError } from './password-renewal.service';

describe('PasswordRenewalService', () => {
  it('starts cleared and emits distinct changes only', () => {
    const service = new PasswordRenewalService();
    const seen: boolean[] = [];
    service.required$.subscribe((value) => seen.push(value));

    service.require();
    service.require();
    service.clear();

    expect(seen).toEqual([
      false,
      true,
      false
    ]);
    expect(service.required).toBe(false);
  });

  describe('isPasswordOutdatedError', () => {
    it('recognises the top-level and nested Fineract codes', () => {
      expect(isPasswordOutdatedError({ userMessageGlobalisationCode: 'error.msg.password.outdated' })).toBe(true);
      expect(
        isPasswordOutdatedError({ errors: [{ userMessageGlobalisationCode: 'error.msg.password.outdated' }] })
      ).toBe(true);
    });

    it('ignores other errors and empty bodies', () => {
      expect(isPasswordOutdatedError({ userMessageGlobalisationCode: 'error.msg.resource.not.found' })).toBe(false);
      expect(isPasswordOutdatedError(null)).toBe(false);
      expect(isPasswordOutdatedError(undefined)).toBe(false);
    });
  });
});
