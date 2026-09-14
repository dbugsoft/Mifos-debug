/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SettingsService } from 'app/settings/settings.service';
import { AuthenticationInterceptor, isCoopRegistryUrl } from './authentication.interceptor';

describe('AuthenticationInterceptor', () => {
  const server = 'https://localhost:8443';
  let interceptor: AuthenticationInterceptor;
  let sent: HttpRequest<unknown> | null;
  const handler: HttpHandler = {
    handle: (request: HttpRequest<unknown>) => {
      sent = request;
      return of(new HttpResponse({ status: 200 }));
    }
  };

  beforeEach(() => {
    sent = null;
    TestBed.configureTestingModule({
      providers: [
        AuthenticationInterceptor,
        { provide: SettingsService, useValue: { server, tenantIdentifier: 'default' } }
      ]
    });
    interceptor = TestBed.inject(AuthenticationInterceptor);
    interceptor.setAuthorizationToken('bWlmb3M6cGFzc3dvcmQ=');
  });

  afterEach(() => interceptor.removeAuthorization());

  it('recognises Cooperative Registry URLs', () => {
    expect(isCoopRegistryUrl(`${server}/fineract-provider/api/nepal/coop-registration/public/profile`)).toBe(true);
    expect(isCoopRegistryUrl(`${server}/fineract-provider/api/v1/offices`)).toBe(false);
  });

  it('never overwrites the Bearer token on Cooperative Registry calls to the same host', () => {
    const request = new HttpRequest('GET', `${server}/fineract-provider/api/nepal/coop-registration/public/status`, {
      headers: undefined
    }).clone({ setHeaders: { Authorization: 'Bearer coop-jwt' } });

    interceptor.intercept(request, handler).subscribe();

    expect(sent?.headers.get('Authorization')).toBe('Bearer coop-jwt');
    expect(sent?.headers.has('Fineract-Platform-TenantId')).toBe(false);
  });

  it('still adds the Mifos credentials and tenant to Fineract calls', () => {
    interceptor.intercept(new HttpRequest('GET', `${server}/fineract-provider/api/v1/offices`), handler).subscribe();

    expect(sent?.headers.get('Authorization')).toMatch(/^(Basic|Bearer) bWlmb3M6cGFzc3dvcmQ=$/);
    expect(sent?.headers.get('Fineract-Platform-TenantId')).toBe('default');
  });
});
