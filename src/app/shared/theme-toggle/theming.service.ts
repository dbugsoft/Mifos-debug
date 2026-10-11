/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Single owner of the light/dark theme. The app always starts light; the top-bar switch turns dark mode on for the
 * current page only, so a refresh, a new tab or signing out returns to light. The OS colour scheme is ignored
 * (following it is what used to switch the app to dark after cancelling the print dialog).
 * Printing always uses the light theme.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemingService {
  theme = new BehaviorSubject('light-theme');

  constructor() {
    this.setDarkMode(false);

    window.addEventListener('beforeprint', () => document.body.classList.remove('dark-theme'));
    window.addEventListener('afterprint', () => document.body.classList.toggle('dark-theme', this.isDark));
  }

  get isDark(): boolean {
    return this.theme.value === 'dark-theme';
  }

  setDarkMode(isDarkMode: boolean) {
    document.body.classList.toggle('dark-theme', isDarkMode);
    document.body.classList.toggle('light-theme', !isDarkMode);
    this.theme.next(isDarkMode ? 'dark-theme' : 'light-theme');
  }
}
