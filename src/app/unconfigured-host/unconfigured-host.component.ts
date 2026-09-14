/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component } from '@angular/core';

/**
 * Shown instead of the sign-in page when this web address is not mapped to any
 * cooperative (see unmappedHostGuard). Deliberately reveals nothing about which
 * cooperatives or tenants exist.
 */
@Component({
  selector: 'mifosx-unconfigured-host',
  standalone: true,
  templateUrl: './unconfigured-host.component.html',
  styleUrl: './unconfigured-host.component.scss'
})
export class UnconfiguredHostComponent {}
