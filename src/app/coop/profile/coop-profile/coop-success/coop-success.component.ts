/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';

import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { CoopAuthService } from '../../../services/coop-auth.service';
import { CoopTokenService } from '../../../services/coop-token.service';

import { QueryClient } from '@tanstack/angular-query-experimental';

import { clearCoopUserQueries } from '../../../queries/coop-cache.util';

@Component({
  selector: 'mifosx-coop-success',

  standalone: true,

  imports: [
    MatButtonModule,
    MatIconModule
  ],

  templateUrl: './coop-success.component.html',

  styleUrl: './coop-success.component.scss'
})
export class CoopSuccessComponent {
  // =====================================================
  // SERVICES
  // =====================================================

  private readonly router = inject(Router);

  private readonly coopAuthService = inject(CoopAuthService);

  private readonly coopTokenService = inject(CoopTokenService);

  private readonly queryClient = inject(QueryClient);

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    const refreshToken = this.coopTokenService.getRefreshToken();

    if (!refreshToken) {
      this.clearCoopSession();

      this.router.navigate([
        '/coop/login'
      ]);

      return;
    }

    this.coopAuthService.logout({ refreshToken }).subscribe({
      next: () => {
        this.clearCoopSession();

        this.router.navigate([
          '/coop/login'
        ]);
      },

      error: () => {
        // Even if backend logout fails,
        // clear the local session.

        this.clearCoopSession();

        this.router.navigate([
          '/coop/login'
        ]);
      }
    });
  }

  // =====================================================
  // CLEAR SESSION
  // =====================================================

  private clearCoopSession(): void {
    this.coopTokenService.clearSession();

    clearCoopUserQueries(this.queryClient);
  }
}
