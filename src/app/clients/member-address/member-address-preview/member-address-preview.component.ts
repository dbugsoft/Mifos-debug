/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MemberAddressView, TemporaryAddressChoice } from '../member-address.model';
import { MemberAddressSummaryComponent } from '../member-address-summary/member-address-summary.component';

/** The addresses as they will be saved, on the review step of "Create member". */
@Component({
  selector: 'mifosx-member-address-preview',
  templateUrl: './member-address-preview.component.html',
  styleUrls: ['./member-address-preview.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MemberAddressSummaryComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberAddressPreviewComponent {
  readonly permanent = input<MemberAddressView | null>(null);
  readonly temporary = input<MemberAddressView | null>(null);
  readonly temporaryChoice = input<TemporaryAddressChoice>('NONE');
}
