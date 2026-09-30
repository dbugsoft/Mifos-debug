/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  ACCOUNT_LOCKED_CODE,
  EMAIL_NOT_VERIFIED_CODE,
  fineractErrorCode,
  isHandledSignInRefusal,
  isStaffAccessUrl
} from './staff-access.service';

describe('staff access helpers', () => {
  const api = 'https://localhost:8443/fineract-provider/api/v1';

  it('reads the error code from the top level or the first nested error', () => {
    expect(fineractErrorCode({ userMessageGlobalisationCode: ACCOUNT_LOCKED_CODE })).toBe(ACCOUNT_LOCKED_CODE);
    expect(fineractErrorCode({ errors: [{ userMessageGlobalisationCode: EMAIL_NOT_VERIFIED_CODE }] })).toBe(
      EMAIL_NOT_VERIFIED_CODE
    );
    expect(fineractErrorCode(null)).toBeUndefined();
  });

  it('leaves a locked or unverified sign-in to the sign-in card, and every other refusal to the usual pop-up', () => {
    expect(isHandledSignInRefusal(`${api}/authentication`, { userMessageGlobalisationCode: ACCOUNT_LOCKED_CODE })).toBe(
      true
    );
    expect(
      isHandledSignInRefusal(`${api}/authentication`, { userMessageGlobalisationCode: EMAIL_NOT_VERIFIED_CODE })
    ).toBe(true);
    expect(isHandledSignInRefusal(`${api}/authentication`, { userMessageGlobalisationCode: 'error.msg.other' })).toBe(
      false
    );
    expect(isHandledSignInRefusal(`${api}/clients`, { userMessageGlobalisationCode: ACCOUNT_LOCKED_CODE })).toBe(false);
  });

  it('recognises the calls whose screens show their own errors', () => {
    expect(isStaffAccessUrl(`${api}/nepal/password-reset/request`)).toBe(true);
    expect(isStaffAccessUrl(`${api}/nepal/staff-email/verification/confirm`)).toBe(true);
    expect(isStaffAccessUrl(`${api}/nepal/staff-email/availability`)).toBe(false);
    expect(isStaffAccessUrl(`${api}/users`)).toBe(false);
  });
});
