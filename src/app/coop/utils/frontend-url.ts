/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/*
 * The web address a cooperative signs in at.
 *
 * It goes into an email telling someone where to type an administrator
 * password, so it is held to a strict shape. Mirrors the backend's
 * FrontendUrlValidator; the server has the final say (it also decides
 * whether http://localhost is acceptable in development).
 */

export const FRONTEND_URL_MAX_LENGTH = 300;

const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]'
]);

export interface FrontendUrlResult {
  /** Canonical form: scheme://host[:port][/path], lower-case host, no trailing slash. */
  value: string | null;
  error: string | null;
}

export function normalizeFrontendUrl(raw: string | null | undefined): FrontendUrlResult {
  const candidate = (raw ?? '').trim();

  if (!candidate) {
    return fail('Enter the web address the cooperative will sign in at.');
  }

  if (candidate.length > FRONTEND_URL_MAX_LENGTH) {
    return fail(`The address must be at most ${FRONTEND_URL_MAX_LENGTH} characters.`);
  }

  if (/\s/.test(candidate) || hasControlCharacters(candidate)) {
    return fail('The address must not contain spaces.');
  }

  if (candidate.includes('?') || candidate.includes('#')) {
    return fail('The address must not contain a query string (?) or fragment (#).');
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    return fail('Enter a full address such as https://coop.example.org');
  }

  if (url.username || url.password || candidate.includes('@')) {
    return fail('The address must not contain a username or password.');
  }

  const protocol = url.protocol.toLowerCase();
  const host = url.hostname.toLowerCase();

  if (!host) {
    return fail('Enter a full address such as https://coop.example.org');
  }

  const permittedInsecure = protocol === 'http:' && LOOPBACK_HOSTS.has(host);

  if (protocol !== 'https:' && !permittedInsecure) {
    return fail('The address must start with https://');
  }

  const path = url.pathname.replace(/\/+$/, '');
  const port = url.port ? `:${url.port}` : '';

  return { value: `${protocol}//${host}${port}${path}`, error: null };
}

export function frontendUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const result = normalizeFrontendUrl(control.value as string | null);

    return result.error ? { frontendUrl: result.error } : null;
  };
}

function fail(error: string): FrontendUrlResult {
  return { value: null, error };
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);

    if (code < 32 || code === 127) {
      return true;
    }
  }

  return false;
}
