/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { CoopTokenService } from '../../services/coop-token.service';
import { CoopAuthService } from '../../services/coop-auth.service';

/**
 * Admits only ADMIN-role registry users, refreshing an expired access
 * token first. Tokens and sessions are never logged.
 */
export const coopAdminGuard: CanActivateFn = () => {
  const coopTokenService = inject(CoopTokenService);

  const coopAuthService = inject(CoopAuthService);

  const router = inject(Router);

  // =====================================================
  // NO SESSION
  // =====================================================

  if (!coopTokenService.isAuthenticated()) {
    return router.createUrlTree([
      '/coop/login'
    ]);
  }

  // =====================================================
  // ACCESS TOKEN STILL VALID
  // =====================================================

  if (!coopTokenService.isAccessTokenExpired()) {
    return coopTokenService.isAdmin()
      ? true
      : router.createUrlTree([
          '/coop/profile'
        ]);
  }

  // =====================================================
  // ACCESS TOKEN EXPIRED
  // =====================================================

  const refreshToken = coopTokenService.getRefreshToken();

  if (!refreshToken) {
    coopTokenService.clearSession();

    return router.createUrlTree([
      '/coop/login'
    ]);
  }

  return coopAuthService
    .refresh({
      refreshToken
    })
    .pipe(
      map((tokens) => {
        /*
         * Save both the new access token and the new refresh
         * token, because the backend rotates refresh tokens.
         */
        coopTokenService.updateTokens(tokens);

        return coopTokenService.isAdmin()
          ? true
          : router.createUrlTree([
              '/coop/profile'
            ]);
      }),

      catchError(() => {
        // The refresh token itself is no longer valid.
        coopTokenService.clearSession();

        return of(
          router.createUrlTree([
            '/coop/login'
          ])
        );
      })
    );
};
