/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Breadcrumb model.
 */
export interface Breadcrumb {
  label: string;
  url: string;
  /**
   * The crumb's route has a component that is displaying the current page around it, as an entity
   * view does for its tabs. Such a crumb is the page itself, so the back button skips it.
   */
  hostsPage?: boolean;
}
