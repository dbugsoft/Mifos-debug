/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl } from '@angular/forms';

import {
  checkCoopPassword,
  coopPasswordValidator,
  isCoopPasswordAcceptable,
  utf8ByteLength
} from './coop-password-policy';

const EMAIL = 'sajilo.manager@example.com';

describe('coop password policy', () => {
  it('accepts a passphrase', () => {
    expect(isCoopPasswordAcceptable(checkCoopPassword('correct horse battery staple', EMAIL))).toBe(true);
  });

  it('requires at least 12 characters', () => {
    expect(checkCoopPassword('Short1!', EMAIL).longEnough).toBe(false);
  });

  it('treats a blank password as too short', () => {
    expect(checkCoopPassword('            ', EMAIL).longEnough).toBe(false);
  });

  it('rejects trivially repetitive passwords', () => {
    expect(checkCoopPassword('abababababab', EMAIL).notTooSimple).toBe(false);
  });

  it('rejects passwords containing the email name, ignoring case', () => {
    expect(checkCoopPassword('Sajilo.Manager2081', EMAIL).noEmailName).toBe(false);
  });

  it('ignores email names shorter than 3 characters', () => {
    expect(checkCoopPassword('ab-long-enough-password', 'ab@example.com').noEmailName).toBe(true);
  });

  it('limits length in bytes, not characters', () => {
    expect(utf8ByteLength('a1b2c3d4'.repeat(9))).toBe(72);
    expect(checkCoopPassword('a1b2c3d4'.repeat(9), EMAIL).notTooLong).toBe(true);
    expect(checkCoopPassword('a1b2c3d4'.repeat(9) + 'x', EMAIL).notTooLong).toBe(false);
    // 32 Devanagari code points: long enough by count, but 96 bytes in UTF-8
    expect(checkCoopPassword('सहकारीसंस्थानेपालकाठमाडौंपासवर्ड', EMAIL).notTooLong).toBe(false);
  });

  it('validator leaves empty values to Validators.required and reports which rules failed', () => {
    const validate = coopPasswordValidator(() => EMAIL);

    expect(validate(new FormControl(''))).toBeNull();
    expect(validate(new FormControl('correct horse battery staple'))).toBeNull();
    expect(validate(new FormControl('short'))).toEqual({
      coopPassword: expect.objectContaining({ longEnough: false })
    });
  });
});
