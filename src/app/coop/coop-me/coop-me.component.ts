/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';

import { CommonModule } from '@angular/common';

import { injectQuery } from '@tanstack/angular-query-experimental';

import { CoopProfileService } from '../services/coop-profile.service';
import { CoopNavbarComponent } from '../coop-navbar/coop-navbar.component';
import { meQueryOptions } from '../queries/coop-profile.queries';
import { extractCoopErrorMessage } from '../queries/coop-error.util';

@Component({
  selector: 'mifosx-coop-me',
  standalone: true,
  imports: [
    CommonModule,
    CoopNavbarComponent
  ],
  templateUrl: './coop-me.component.html',
  styleUrl: './coop-me.component.scss'
})
export class CoopMeComponent {
  private coopProfileService = inject(CoopProfileService);

  private meQuery = injectQuery(() => meQueryOptions(this.coopProfileService));

  get me() {
    return this.meQuery.data() ?? null;
  }

  get loading(): boolean {
    return this.meQuery.isPending();
  }

  get errorMessage(): string {
    if (!this.meQuery.isError()) {
      return '';
    }

    return extractCoopErrorMessage(this.meQuery.error(), 'Unable to load user information.');
  }
}
