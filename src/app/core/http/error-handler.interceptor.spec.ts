/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse, HttpHandler, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { throwError } from 'rxjs';

import { AlertService } from '../alert/alert.service';
import { PasswordRenewalService } from '../authentication/password-renewal.service';
import { ErrorHandlerInterceptor } from './error-handler.interceptor';

describe('ErrorHandlerInterceptor', () => {
  const url = 'https://10.0.0.5/fineract-provider/api/v1/clients/16/images';
  let interceptor: ErrorHandlerInterceptor;
  let alert: jest.Mock;

  /** Runs one failed request through the interceptor and returns the alert it raised. */
  function fail(status: number, error: any): { type: string; message: string } {
    const handler: HttpHandler = {
      handle: () => throwError(() => new HttpErrorResponse({ status, error, url, statusText: 'x' }))
    };
    interceptor.intercept(new HttpRequest('POST', url, null), handler).subscribe({ error: () => {} });
    return alert.mock.calls[0][0];
  }

  beforeEach(() => {
    alert = jest.fn();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        ErrorHandlerInterceptor,
        { provide: AlertService, useValue: { alert } },
        { provide: PasswordRenewalService, useValue: { require: jest.fn() } }
      ]
    });
    TestBed.inject(TranslateService).setTranslation('en', {
      'error.msg.upload.file.too.big': 'Max {{args.0.value}} MB.',
      errors: { 'error.file.too.large.type': 'File Too Large' }
    });
    TestBed.inject(TranslateService).use('en');
    interceptor = TestBed.inject(ErrorHandlerInterceptor);
  });

  it('titles a Fineract 413 as file too large and interpolates the limit', () => {
    const body = {
      defaultUserMessage: 'The selected file is larger than the 5 MB limit.',
      userMessageGlobalisationCode: 'error.msg.upload.file.too.big',
      errors: [
        {
          defaultUserMessage: 'The selected file is larger than the 5 MB limit.',
          parameterName: 'file',
          userMessageGlobalisationCode: 'error.msg.upload.file.too.big',
          args: [{ value: 5 }]
        }
      ]
    };
    expect(fail(413, body)).toEqual({ type: 'File Too Large', message: 'Max 5 MB.' });
  });

  it('never leaks the request URL for a non-JSON body', () => {
    for (const [
      status,
      error
    ] of [
      [
        413,
        '<html>413 Request Entity Too Large</html>'
      ],
      [
        502,
        '<html>Bad Gateway</html>'
      ],
      [
        504,
        null
      ],
      [
        0,
        new ProgressEvent('error')
      ]
    ] as const) {
      alert.mockClear();
      const { message } = fail(status, error);
      expect(message).not.toContain('10.0.0.5');
      expect(message).not.toContain('Http failure');
    }
  });
});
