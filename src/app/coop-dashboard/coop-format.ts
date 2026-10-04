/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Numbers the way Nepal writes them: lakh and crore, grouped 12,34,567. */
const GROUPED = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function grouped(value: number | null | undefined): string {
  return value == null ? '–' : GROUPED.format(value);
}

/** A short amount: 24.38 Cr, 85.6 L, 45,000. */
export function shortAmount(value: number | null | undefined): string {
  if (value == null) return '–';
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${trim(value / 1e7, 2)} Cr`;
  if (abs >= 1e5) return `${trim(value / 1e5, 1)} L`;
  return GROUPED.format(value);
}

export function percent(value: number | null | undefined, digits = 1): string {
  return value == null ? '–' : `${Number(value).toFixed(digits)}%`;
}

/** Change from previous to current as a percentage, or null when there is nothing to compare with. */
export function change(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null || Number(previous) === 0) return null;
  return ((Number(current) - Number(previous)) / Math.abs(Number(previous))) * 100;
}

function trim(value: number, digits: number): string {
  const fixed = value.toFixed(digits);
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
}
