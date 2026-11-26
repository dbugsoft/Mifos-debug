/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject } from '@angular/core';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { environment } from 'environments/environment';

/**
 * The app's permission directive's rule, for code that must decide (a form shown locked, an action chosen) rather than
 * hide a template. Call in an injection context.
 */
export function injectHasPermission(): (permission: string) => boolean {
  const granted: string[] = inject(AuthenticationService).getCredentials()?.permissions ?? [];
  return (permission) =>
    !environment.productionModeEnableRBAC || granted.includes('ALL_FUNCTIONS') || granted.includes(permission);
}
