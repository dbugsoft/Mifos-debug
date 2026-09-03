/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, Input, inject } from '@angular/core';

import { CommonModule } from '@angular/common';

import { Router, RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';

import { CoopAuthService } from '../services/coop-auth.service';

import { CoopTokenService } from '../services/coop-token.service';

@Component({
  selector: 'mifosx-coop-navbar',

  standalone: true,

  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule
  ],

  templateUrl: './coop-navbar.component.html',

  styleUrl: './coop-navbar.component.scss'
})
export class CoopNavbarComponent {
  // =====================================================
  // PAGE TITLE
  // =====================================================

  @Input()
  title = 'Cooperative Profile';

  // =====================================================
  // PAGE SUBTITLE
  // =====================================================

  @Input()
  subtitle = "Manage your cooperative's registration and contact information.";

  // =====================================================
  // SERVICES
  // =====================================================

  private readonly router = inject(Router);

  private readonly coopAuthService = inject(CoopAuthService);

  private readonly coopTokenService = inject(CoopTokenService);

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    const refreshToken = this.coopTokenService.getRefreshToken();

    // ---------------------------------------------------
    // NO REFRESH TOKEN
    // ---------------------------------------------------

    if (!refreshToken) {
      this.coopTokenService.clearSession();

      this.router.navigate([
        '/coop/login'
      ]);

      return;
    }

    // ---------------------------------------------------
    // LOGOUT API
    // ---------------------------------------------------

    this.coopAuthService
      .logout({
        refreshToken
      })
      .subscribe({
        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        next: () => {
          this.coopTokenService.clearSession();

          this.router.navigate([
            '/coop/login'
          ]);
        },

        // ---------------------------------------------
        // ERROR
        // ---------------------------------------------

        error: () => {
          /*
           * Even if backend logout fails,
           * clear local session.
           */

          this.coopTokenService.clearSession();

          this.router.navigate([
            '/coop/login'
          ]);
        }
      });
  }
}
