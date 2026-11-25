/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Route as ngRoute, Routes } from '@angular/router';

/**
 * Provides helper methods to create routes.
 */
export class Route {
  /**
   * Groups a feature's routes that are shown inside the shell.
   *
   * The shell (sidebar, top bar) and the sign-in guard are set once, on the signed-in route in
   * app-routing.module.ts, and every feature module is lazy-loaded below it. A shell per feature module made
   * the whole layout rebuild, and its calls repeat, on every module change (fineract-dbug #338).
   * @param routes The routes to add.
   * @return {Route} A path-less route holding them.
   */
  static withShell(routes: Routes): ngRoute {
    return {
      path: '',
      children: routes
    };
  }
}
