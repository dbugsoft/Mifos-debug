/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';

/**
 * Whether place names should be written Nepali first, following the language the user has chosen.
 * Must be called in an injection context, e.g. a component field initialiser.
 */
export function injectNepaliFirst(): Signal<boolean> {
  const translateService = inject(TranslateService);
  return toSignal(
    translateService.onLangChange.pipe(
      map((event) => event.lang),
      startWith(translateService.currentLang),
      map((lang) => !!lang?.toLowerCase().startsWith('ne'))
    ),
    { initialValue: false }
  );
}
