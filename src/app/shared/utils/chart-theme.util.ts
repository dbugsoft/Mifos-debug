/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Chart } from 'chart.js';

/** Sets Chart.js default text and grid colours for the current light/dark theme. Call before creating a chart. */
export function applyChartTheme(): void {
  const css = getComputedStyle(document.body);
  Chart.defaults.color = css.getPropertyValue('--dk-text-2').trim() || '#666';
  Chart.defaults.borderColor = css.getPropertyValue('--dk-border').trim() || 'rgba(0, 0, 0, 0.1)';
}
