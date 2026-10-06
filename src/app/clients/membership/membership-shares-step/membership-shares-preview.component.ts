/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { SharesChoice } from './membership-shares-step.component';

/** The Shares block of the Create Member preview, while the share-first rule is on. */
@Component({
  selector: 'mifosx-membership-shares-preview',
  template: `
    @if (choice) {
      <div class="shares-preview">
        <h3>{{ 'membership.Shares' | translate }}</h3>
        <div class="grid">
          <span class="label">{{ 'membership.Share product' | translate }}</span>
          <span>{{ choice.product.name }}</span>
          <span class="label">{{ 'membership.Kitta' | translate }}</span>
          <span>{{ choice.kitta }} ({{ 'membership.Rs' | translate }} {{ choice.shareAmount | formatNumber }})</span>
          @for (charge of choice.charges; track charge.name) {
            <span class="label">{{ charge.name }}</span>
            <span>{{ 'membership.Rs' | translate }} {{ charge.amount | formatNumber }}</span>
          }
          <span class="label">{{
            (choice.paidNow ? 'membership.Paid with the application' : 'membership.To pay at approval') | translate
          }}</span>
          <span
            ><b>{{ 'membership.Rs' | translate }} {{ choice.total | formatNumber }}</b></span
          >
          @if (choice.note) {
            <span class="label">{{ 'membership.Note' | translate }}</span>
            <span>{{ choice.note }}</span>
          }
        </div>
        <p class="hint">{{ 'membership.pendingExplanation' | translate }}</p>
      </div>
    }
  `,
  styles: [
    `
      .shares-preview {
        margin: 8px 0 16px;
      }
      h3 {
        margin: 0 0 8px;
      }
      .grid {
        display: grid;
        grid-template-columns: minmax(140px, 220px) 1fr;
        gap: 6px 16px;
      }
      .label {
        opacity: 0.7;
      }
      .hint {
        opacity: 0.7;
        margin: 10px 0 0;
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FormatNumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipSharesPreviewComponent {
  @Input() choice: SharesChoice | null = null;
}
