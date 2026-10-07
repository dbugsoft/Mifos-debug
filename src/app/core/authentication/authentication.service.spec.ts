/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { TranslateService } from '@ngx-translate/core';

import { AuthenticationService } from './authentication.service';
import { AuthenticationInterceptor } from './authentication.interceptor';
import { PasswordRenewalService } from './password-renewal.service';
import { AlertService } from '../alert/alert.service';

describe('AuthenticationService.changePassword', () => {
  let service: AuthenticationService;
  let http: HttpTestingController;

  beforeEach(() => {
    // setup-jest.ts mocks both storages with one no-op object; back it with a map for these tests.
    const store = new Map<string, string>();
    jest.mocked(sessionStorage.getItem).mockImplementation((key) => store.get(key) ?? null);
    jest.mocked(sessionStorage.setItem).mockImplementation((key, value) => void store.set(key, value));
    jest.mocked(sessionStorage.removeItem).mockImplementation((key) => void store.delete(key));
    sessionStorage.setItem('mifosXCredentials', JSON.stringify({ userId: 7, username: 'mifos' }));
    TestBed.configureTestingModule({
      providers: [
        AuthenticationService,
        PasswordRenewalService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AlertService, useValue: { alert: jest.fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: OAuthService, useValue: { setStorage: jest.fn() } },
        {
          provide: AuthenticationInterceptor,
          useValue: {
            setAuthorizationToken: jest.fn(),
            setTwoFactorAccessToken: jest.fn(),
            removeAuthorization: jest.fn(),
            removeTwoFactorAuthorization: jest.fn()
          }
        }
      ]
    });
    service = TestBed.inject(AuthenticationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => [
      sessionStorage.getItem,
      sessionStorage.setItem,
      sessionStorage.removeItem
    ].forEach((fn) => jest.mocked(fn).mockReset()));

  it('signs in again with the new password after changing its own password', () => {
    let done = false;
    service.changePassword('7', { password: 'new-pass', repeatPassword: 'new-pass' }).subscribe(() => (done = true));

    http.expectOne('/users/7').flush({});
    expect(done).toBe(false);

    const login = http.expectOne('/authentication');
    expect(login.request.body).toEqual({ username: 'mifos', password: 'new-pass', remember: false });
    login.flush({ userId: 7, username: 'mifos', base64EncodedAuthenticationKey: 'new-key' });

    expect(done).toBe(true);
    expect(service.getCredentials().base64EncodedAuthenticationKey).toBe('new-key');
    http.verify();
  });

  it("does not sign in again after changing another user's password", () => {
    service.changePassword('8', { password: 'new-pass', repeatPassword: 'new-pass' }).subscribe();

    http.expectOne('/users/8').flush({});
    http.verify();
  });
});
