/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormGroup } from '@angular/forms';
import { RelatedPartyApiErrorDetail } from './related-parties.models';

export function applyServerErrors(form: FormGroup, errors: RelatedPartyApiErrorDetail[] | undefined): string | null {
  if (!errors?.length) {
    return 'Something went wrong. Please check the details and try again.';
  }
  let generalMessage: string | null = null;
  for (const e of errors) {
    const message = e.defaultUserMessage || 'This field is invalid.';
    const control = e.parameterName ? form.get(e.parameterName) : null;
    if (control) {
      control.setErrors({ server: message });
    } else {
      generalMessage = generalMessage ? `${generalMessage} ${message}` : message;
    }
  }
  return generalMessage;
}
