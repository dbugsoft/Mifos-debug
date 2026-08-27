/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

import { CoopAuthService } from '../../services/coop-auth.service';
import { CoopTokenService } from '../../services/coop-token.service';

/*
 * Module-level state shared across every call to this
 * interceptor (this file is a singleton ES module, so
 * these persist for the lifetime of the app).
 *
 * isRefreshing:
 *   True while a /refresh call is in flight, so that if
 *   several requests 401 at the same time we only call
 *   /refresh ONCE instead of once per failed request.
 *
 * refreshTokenSubject:
 *   Emits the new accessToken once a refresh completes.
 *   Any request that arrived while a refresh was already
 *   in progress waits on this instead of triggering its
 *   own refresh call.
 */
let isRefreshing = false;

const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const coopAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const coopTokenService = inject(CoopTokenService);
  const coopAuthService = inject(CoopAuthService);
  const router = inject(Router);

  const isCoopApi = req.url.includes('/api/nepal/coop-registration/');

  if (!isCoopApi) {
    return next(req);
  }

  const isPublicAuthApi =
    req.url.includes('/public/register') ||
    req.url.includes('/public/login') ||
    req.url.includes('/public/verify-email') ||
    req.url.includes('/public/resend-otp') ||
    req.url.includes('/public/refresh');

  if (isPublicAuthApi) {
    return next(req);
  }

  const accessToken = coopTokenService.getAccessToken();

  const authReq = accessToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      /*
       * The backend returns 403 (not 401) for an
       * invalid/expired access token on protected
       * endpoints, so both statuses are treated as
       * "needs a token refresh" here. This does not
       * affect /public/login's own 403 "Email not
       * verified" response - that endpoint is already
       * excluded above and never reaches this catchError.
       */

      const isAuthError = error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);

      if (!isAuthError) {
        return throwError(() => error);
      }

      return handleUnauthorized(req, next, coopTokenService, coopAuthService, router);
    })
  );
};

/**
 * Handles a 401 from any protected Coop API call:
 *
 * - If no refresh is currently in flight, start one.
 *   On success, save the new tokens and retry the
 *   original request with the new access token.
 *   On failure, the refresh token is no longer valid -
 *   clear the session and send the user to login.
 *
 * - If a refresh is already in flight (triggered by a
 *   different request that also 401'd around the same
 *   time), wait for it to finish and reuse its result
 *   instead of calling /refresh again.
 */
function handleUnauthorized(
  originalReq: Parameters<HttpInterceptorFn>[0],
  next: Parameters<HttpInterceptorFn>[1],
  coopTokenService: CoopTokenService,
  coopAuthService: CoopAuthService,
  router: Router
) {
  if (!isRefreshing) {
    isRefreshing = true;

    refreshTokenSubject.next(null);

    const refreshToken = coopTokenService.getRefreshToken();

    if (!refreshToken) {
      isRefreshing = false;

      coopTokenService.clearSession();

      router.navigate(['/coop/login']);

      return throwError(() => new Error('No refresh token available.'));
    }

    return coopAuthService.refresh({ refreshToken }).pipe(
      switchMap((tokens) => {
        coopTokenService.updateTokens(tokens);

        isRefreshing = false;

        refreshTokenSubject.next(tokens.accessToken);

        const retriedReq = originalReq.clone({
          setHeaders: {
            Authorization: `Bearer ${tokens.accessToken}`
          }
        });

        return next(retriedReq);
      }),

      catchError((refreshError) => {
        isRefreshing = false;

        coopTokenService.clearSession();

        router.navigate(['/coop/login']);

        return throwError(() => refreshError);
      })
    );
  }

  /*
   * A refresh is already in progress - wait for it to
   * emit the new access token, then retry this request
   * with it instead of starting a second refresh call.
   */

  return refreshTokenSubject.pipe(
    filter((token): token is string => token !== null),

    take(1),

    switchMap((newAccessToken) => {
      const retriedReq = originalReq.clone({
        setHeaders: {
          Authorization: `Bearer ${newAccessToken}`
        }
      });

      return next(retriedReq);
    })
  );
}
