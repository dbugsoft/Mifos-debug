/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, Input } from '@angular/core';

import { COOP_PASSWORD_MIN_LENGTH, checkCoopPassword } from '../../utils/coop-password-policy';

interface ChecklistItem {
  label: string;
  met: boolean;
}

/**
 * Live checklist of the registry password rules, shown under a new-password field
 * so the user sees what is needed before the server has to refuse it.
 */
@Component({
  selector: 'mifosx-coop-password-checklist',
  standalone: true,
  templateUrl: './coop-password-checklist.component.html',
  styleUrl: './coop-password-checklist.component.scss'
})
export class CoopPasswordChecklistComponent {
  @Input() password: string | null = '';

  @Input() email: string | null = '';

  get items(): ChecklistItem[] {
    const check = checkCoopPassword(this.password, this.email);
    const items: ChecklistItem[] = [
      { label: `At least ${COOP_PASSWORD_MIN_LENGTH} characters`, met: check.longEnough },
      { label: 'Not too simple (use a mix of words, numbers or symbols)', met: check.notTooSimple },
      { label: 'Does not contain the name part of your email address', met: check.noEmailName }
    ];

    if (!check.notTooLong) {
      items.push({ label: 'Too long: use at most 72 characters (fewer for non-English characters)', met: false });
    }

    return items;
  }
}
