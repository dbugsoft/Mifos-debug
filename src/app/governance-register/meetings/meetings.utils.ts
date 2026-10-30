/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormGroup } from '@angular/forms';
import { MeetingsApiErrorDetail } from './meetings.models';

export function isoDate(d: Date | null | undefined): string | null {
  return d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : null;
}

export function parseDate(s: string | null | undefined): Date | null {
  return s ? new Date(s + 'T00:00:00') : null;
}

export function applyServerErrors(form: FormGroup, errors: MeetingsApiErrorDetail[] | undefined): string | null {
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

export function saveBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName || 'file';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
