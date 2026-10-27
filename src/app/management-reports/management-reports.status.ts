/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** The `.chip` colour (shared compliance look) for each of a report's five states. */
export function statusChipClass(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'green';
    case 'SUBMITTED':
      return 'blue';
    case 'RETURNED':
      return 'amber';
    case 'DISCARDED':
      return 'red';
    default:
      return 'grey';
  }
}
