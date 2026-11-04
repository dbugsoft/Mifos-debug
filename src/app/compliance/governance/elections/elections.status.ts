/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** The `.chip` colour (shared compliance look) for each of an election's five states. */
export function electionStatusChipClass(status: string): string {
  switch (status) {
    case 'ROLL_FROZEN':
      return 'amber';
    case 'LIST_PUBLISHED':
      return 'blue';
    case 'DECLARED':
      return 'green';
    case 'CANCELLED':
      return 'red';
    default:
      return 'grey';
  }
}

/** The `.chip` colour for a candidate's status. */
export function nominationStatusChipClass(status: string): string {
  switch (status) {
    case 'ACCEPTED':
      return 'green';
    case 'REFUSED':
      return 'red';
    default:
      return 'grey';
  }
}
