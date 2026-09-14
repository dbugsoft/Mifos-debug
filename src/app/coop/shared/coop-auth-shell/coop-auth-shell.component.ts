/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Shared shell for the coop Login and Create Account pages.
 *
 * Renders the hero/welcome panel once and hosts a `<router-outlet>` for the
 * swappable form side, so navigating between /coop/login and /coop/register
 * (nested under this component in coop-routing.module.ts) never destroys and
 * recreates the hero panel - only the outlet content changes.
 */
@Component({
  selector: 'mifosx-coop-auth-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './coop-auth-shell.component.html',
  styleUrl: './coop-auth-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoopAuthShellComponent {}
