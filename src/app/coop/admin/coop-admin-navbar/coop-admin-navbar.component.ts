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
import { CoopAuthService } from '../../services/coop-auth.service';
import { CoopTokenService } from '../../services/coop-token.service';

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

  logout(): void {
    const refreshToken = this.coopTokenService.getRefreshToken();

    if (!refreshToken) {
      this.coopTokenService.clearSession();
      this.router.navigate(['/coop/login']);
      return;
    }

    this.coopAuthService.logout({ refreshToken }).subscribe({
      next: () => {
        this.coopTokenService.clearSession();
        this.router.navigate(['/coop/login']);
      },
      error: () => {
        this.coopTokenService.clearSession();
        this.router.navigate(['/coop/login']);
      }
    });
  }
}
