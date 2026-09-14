/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/*
 * Cooperative Registry password rules.
 *
 * A registry password is also the one-time password for the
 * cooperative's first sign-in to its core banking system, so these
 * mirror CoopPasswordPolicy on the backend exactly. The server is
 * still the authority: when it disagrees, show its message.
 *
 * Length over composition (NIST SP 800-63B): passphrases with spaces
 * are fine, and there are deliberately no upper-case/digit/symbol rules.
 */

export const COOP_PASSWORD_MIN_LENGTH = 12;

/** bcrypt only uses the first 72 bytes of a password, and the server rejects longer ones. */
export const COOP_PASSWORD_MAX_BYTES = 72;

const MIN_DISTINCT_CHARACTERS = 4;

const MIN_EMAIL_NAME_LENGTH = 3;

export interface CoopPasswordCheck {
  longEnough: boolean;
  notTooLong: boolean;
  notTooSimple: boolean;
  noEmailName: boolean;
}

export function checkCoopPassword(
  password: string | null | undefined,
  email: string | null | undefined
): CoopPasswordCheck {
  const value = password ?? '';
  const characters = Array.from(value);
  const emailName = emailNameOf(email);

  return {
    longEnough: characters.length >= COOP_PASSWORD_MIN_LENGTH && value.trim().length > 0,
    notTooLong: utf8ByteLength(value) <= COOP_PASSWORD_MAX_BYTES,
    notTooSimple: new Set(characters).size >= MIN_DISTINCT_CHARACTERS,
    noEmailName: !emailName || !value.toLowerCase().includes(emailName)
  };
}

export function isCoopPasswordAcceptable(check: CoopPasswordCheck): boolean {
  return check.longEnough && check.notTooLong && check.notTooSimple && check.noEmailName;
}

/**
 * Reactive-forms validator. An empty value is left to Validators.required.
 * The email is read lazily so the rule follows the email field as it changes.
 */
export function coopPasswordValidator(getEmail: () => string | null | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;

    if (!value) {
      return null;
    }

    const check = checkCoopPassword(value, getEmail());

    return isCoopPasswordAcceptable(check) ? null : { coopPassword: check };
  };
}

/** UTF-8 byte length, counted the same way the server's bcrypt limit is. */
export function utf8ByteLength(value: string): number {
  let bytes = 0;

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;

    if (codePoint <= 0x7f) {
      bytes += 1;
    } else if (codePoint <= 0x7ff) {
      bytes += 2;
    } else if (codePoint <= 0xffff) {
      bytes += 3;
    } else {
      bytes += 4;
    }
  }

  return bytes;
}

function emailNameOf(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const at = email.indexOf('@');
  const name = (at < 0 ? email : email.substring(0, at)).trim().toLowerCase();

  return name.length >= MIN_EMAIL_NAME_LENGTH ? name : null;
}
