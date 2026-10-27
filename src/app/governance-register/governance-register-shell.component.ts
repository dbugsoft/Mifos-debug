/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatTabNav, MatTabNavPanel, MatTabLink } from '@angular/material/tabs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * The governance register's own tabs (fineract-dbug #138): committees, people, the directors' table and who has
 * declared their property. Kept apart from the AML-focused Compliance > Governance screen.
 */
@Component({
  selector: 'mifosx-governance-register-shell',
  templateUrl: './governance-register-shell.component.html',
  styleUrls: ['./governance-register-shell.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatTabNav,
    MatTabNavPanel,
    MatTabLink
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GovernanceRegisterShellComponent {}
