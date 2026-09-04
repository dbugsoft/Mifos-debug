/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { CoopAuthService } from '../../services/coop-auth.service';
import { CoopTokenService } from '../../services/coop-token.service';
import { clearCoopUserQueries } from '../../queries/coop-cache.util';

@Component({
  selector: 'mifosx-coop-admin-navbar',
  standalone: true,
  imports: [
    MatButtonModule,
    RouterLink
  ],
  templateUrl: './coop-admin-navbar.component.html',
  styleUrl: './coop-admin-navbar.component.scss'
})
export class CoopAdminNavbarComponent {
  private readonly router = inject(Router);
  private readonly coopAuthService = inject(CoopAuthService);
  private readonly coopTokenService = inject(CoopTokenService);
  private readonly queryClient = inject(QueryClient);

  logout(): void {
    const refreshToken = this.coopTokenService.getRefreshToken();

    if (!refreshToken) {
      this.clearCoopSession();
      this.router.navigate(['/coop/login']);
      return;
    }

    this.coopAuthService.logout({ refreshToken }).subscribe({
      next: () => {
        this.clearCoopSession();
        this.router.navigate(['/coop/login']);
      },
      error: () => {
        this.clearCoopSession();
        this.router.navigate(['/coop/login']);
      }
    });
  }

  /**
   * Clears tokens plus every user-specific cached query, so
   * a different account logging in afterwards never sees
   * this user's cached profile/admin data.
   */
  private clearCoopSession(): void {
    this.coopTokenService.clearSession();
    clearCoopUserQueries(this.queryClient);
  }
}
