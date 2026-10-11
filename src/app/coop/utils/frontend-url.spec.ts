/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl } from '@angular/forms';

import { frontendUrlValidator, normalizeFrontendUrl } from './frontend-url';

describe('normalizeFrontendUrl', () => {
  it('normalises case and trailing slashes', () => {
    expect(normalizeFrontendUrl('  HTTPS://Sajilo.Example.ORG/  ').value).toBe('https://sajilo.example.org');
    expect(normalizeFrontendUrl('https://coop.example.com:8443/app/').value).toBe('https://coop.example.com:8443/app');
  });

  it.each([
    'http://sajilo.example.org',
    'ftp://sajilo.example.org',
    'javascript:alert(1)',
    'sajilo.example.org',
    'https://user:pass@sajilo.example.org',
    'https://sajilo.example.org/?tenant=x',
    'https://sajilo.example.org/#login',
    'https://sajilo.example.org/a b',
    'https://',
    ''
  ])('rejects %p', (url) => {
    const result = normalizeFrontendUrl(url);

    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('rejects overlong addresses', () => {
    expect(normalizeFrontendUrl('https://example.com/' + 'a'.repeat(300)).error).toContain('300');
  });

  it('allows http only for loopback hosts', () => {
    expect(normalizeFrontendUrl('http://localhost:4200').value).toBe('http://localhost:4200');
    expect(normalizeFrontendUrl('http://127.0.0.1:4200/').value).toBe('http://127.0.0.1:4200');
  });

  it('exposes the message through the form validator', () => {
    const validate = frontendUrlValidator();

    expect(validate(new FormControl('https://sajilo.example.org'))).toBeNull();
    expect(validate(new FormControl('http://sajilo.example.org'))).toEqual({
      frontendUrl: 'The address must start with https://'
    });
  });
});
