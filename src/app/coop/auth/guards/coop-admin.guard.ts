/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with
 * this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { CoopTokenService } from '../../services/coop-token.service';
import { CoopAuthService } from '../../services/coop-auth.service';

export const coopAdminGuard: CanActivateFn = () => {
  const coopTokenService = inject(CoopTokenService);

  const coopAuthService = inject(CoopAuthService);

  const router = inject(Router);

  console.log('===== COOP ADMIN GUARD =====');

  console.log('Authenticated:', coopTokenService.isAuthenticated());

  console.log('Access Token:', coopTokenService.getAccessToken());

  console.log('Refresh Token:', coopTokenService.getRefreshToken());

  console.log('Roles:', coopTokenService.getRoles());

  console.log('Is Admin:', coopTokenService.isAdmin());

  console.log('Access Token Expired:', coopTokenService.isAccessTokenExpired());

  // =====================================================
  // NO SESSION
  // =====================================================

  if (!coopTokenService.isAuthenticated()) {
    console.log('GUARD → LOGIN');

    return router.createUrlTree([
      '/coop/login'
    ]);
  }

  // =====================================================
  // ACCESS TOKEN STILL VALID
  // =====================================================

  if (!coopTokenService.isAccessTokenExpired()) {
    console.log('ACCESS TOKEN VALID');

    if (coopTokenService.isAdmin()) {
      console.log('GUARD → ADMIN');

      return true;
    }

    console.log('GUARD → PROFILE');

    return router.createUrlTree([
      '/coop/profile'
    ]);
  }

  // =====================================================
  // ACCESS TOKEN EXPIRED
  // =====================================================

  console.log('ACCESS TOKEN EXPIRED');

  const refreshToken = coopTokenService.getRefreshToken();

  // =====================================================
  // NO REFRESH TOKEN
  // =====================================================

  if (!refreshToken) {
    console.log('NO REFRESH TOKEN → LOGIN');

    coopTokenService.clearSession();

    return router.createUrlTree([
      '/coop/login'
    ]);
  }

  // =====================================================
  // REFRESH TOKEN
  // =====================================================

  console.log('REFRESHING ACCESS TOKEN...');

  return coopAuthService
    .refresh({
      refreshToken
    })
    .pipe(
      // =================================================
      // REFRESH SUCCESS
      // =================================================

      map((tokens) => {
        console.log('TOKEN REFRESH SUCCESS');

        console.log('NEW ACCESS TOKEN:', tokens.accessToken);

        console.log('NEW REFRESH TOKEN:', tokens.refreshToken);

        /*
         * IMPORTANT:
         *
         * Save both:
         *
         * new accessToken
         * new refreshToken
         *
         * because backend uses refresh-token rotation.
         */

        coopTokenService.updateTokens(tokens);

        console.log('UPDATED SESSION:', coopTokenService.getSession());

        // ===============================================
        // CHECK NEW TOKEN ROLE
        // ===============================================

        const isAdmin = coopTokenService.isAdmin();

        console.log('NEW TOKEN ROLES:', coopTokenService.getRoles());

        console.log('NEW TOKEN IS ADMIN:', isAdmin);

        if (isAdmin) {
          console.log('GUARD → ADMIN AFTER REFRESH');

          return true;
        }

        console.log('GUARD → PROFILE AFTER REFRESH');

        return router.createUrlTree([
          '/coop/profile'
        ]);
      }),

      // =================================================
      // REFRESH FAILED
      // =================================================

      catchError((error) => {
        console.error('TOKEN REFRESH FAILED:', error);

        /*
         * Refresh token itself is no longer valid.
         *
         * Now it is safe to clear the session.
         */

        coopTokenService.clearSession();

        return of(
          router.createUrlTree([
            '/coop/login'
          ])
        );
      })
    );
};
