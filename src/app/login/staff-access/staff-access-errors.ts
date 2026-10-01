/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { fineractErrorMessage } from '../../core/authentication/staff-access.service';

/**
 * The text to show on the sign-in card for a refused verification or reset call. The backend's own messages were
 * written for staff (for example how many tries are left), so they are shown as they are; a lost connection, the rate
 * limit, and errors without a message get the app's wording.
 */
export function staffAccessErrorText(error: HttpErrorResponse, translate: TranslateService): string {
  if (error.status === 0) {
    return translate.instant('errors.http.connection.message');
  }
  if (error.status === 429) {
    return translate.instant('staffAccess.errors.Too soon');
  }
  return fineractErrorMessage(error.error) || translate.instant('staffAccess.errors.Something went wrong');
}
