/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, EventEmitter, OnDestroy, Output, inject } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { CoopProfileService, CoopSystemStatus } from '../../services/coop-profile.service';
import { statusQueryOptions } from '../../queries/coop-profile.queries';

/**
 * "Your cooperative system" card: where the application stands and, once
 * the cooperative is ACTIVE, where and as whom to sign in. Never a password.
 */
@Component({
  selector: 'mifosx-coop-system-status',
  standalone: true,
  templateUrl: './coop-system-status.component.html',
  styleUrl: './coop-system-status.component.scss'
})
export class CoopSystemStatusComponent implements OnDestroy {
  private coopProfileService = inject(CoopProfileService);

  private clipboard = inject(Clipboard);

  private statusQuery = injectQuery(() => statusQueryOptions(this.coopProfileService));

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  copied = false;

  /**
   * Emitted by the "Next" button on the ACTIVE welcome page only -
   * lets the profile stepper shell move on to the General Information
   * step. PENDING/PROVISIONED/etc. render no such button.
   */
  @Output()
  next = new EventEmitter<void>();

  get status(): CoopSystemStatus | null {
    return this.statusQuery.data() ?? null;
  }

  get loading(): boolean {
    return this.statusQuery.isPending();
  }

  copyUsername(): void {
    const username = this.status?.tenantAdminUsername;

    if (!username) {
      return;
    }

    this.copied = this.clipboard.copy(username);

    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
    }

    this.copiedTimer = setTimeout(() => (this.copied = false), 2000);
  }

  ngOnDestroy(): void {
    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
    }
  }
}
