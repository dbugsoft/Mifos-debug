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

/**
 * The membership part of the Create Member preview, while the share-first rule is on: everything typed for the
 * application, in the order of the form (fineract-dbug ADR 0023 and 0035). Laid out like the member details above it.
 */
@Component({
  selector: 'mifosx-membership-shares-preview',
  template: `
    @if (choice) {
      <div class="membership-preview">
        <h3>{{ 'membership.Membership' | translate }}</h3>
        <div class="grid">
          @if (submittedOn) {
            <div class="item">
              <span class="label">{{ 'membership.Application date' | translate }}</span>
              <span class="value">{{ submittedOn | dateFormat }}</span>
            </div>
          }
          @if (!organisation) {
            <div class="item">
              <span class="label">{{ 'membership.Citizenship number' | translate }}</span>
              <span class="value">{{ citizenshipNumber || '—' }}</span>
            </div>
            <div class="item">
              <span class="label">{{ 'membership.Issuing district' | translate }}</span>
              <span class="value">{{ district || '—' }}</span>
            </div>
          }
          <div class="item">
            <span class="label">{{ 'membership.Shares' | translate }}</span>
            <span class="value"
              >{{ choice.kitta }} {{ 'membership.kitta' | translate }} · {{ choice.product.name }} ·
              {{ 'membership.Rs' | translate }} {{ choice.shareAmount | formatNumber }}</span
            >
          </div>
          @for (charge of choice.charges; track charge.name) {
            <div class="item">
              <span class="label">{{ charge.name }}</span>
              <span class="value">{{ 'membership.Rs' | translate }} {{ charge.amount | formatNumber }}</span>
            </div>
          }
          <div class="item">
            <span class="label">{{
              (choice.paidNow ? 'membership.Paid with the application' : 'membership.To pay at approval') | translate
            }}</span>
            <span class="value"
              ><b>{{ 'membership.Rs' | translate }} {{ choice.total | formatNumber }}</b>
              @if (choice.paidNow && receiptNumber) {
                · {{ 'membership.receiptNo' | translate: { number: receiptNumber } }}
              }
            </span>
          </div>
          @if (!organisation) {
            <div class="item">
              <span class="label">{{ 'membership.Nominee' | translate }}</span>
              <span class="value">
                @if (nomineeName) {
                  {{ nomineeName }} ({{ nomineeRelationship }})
                  @if (nomineeMobileNo) {
                    · {{ nomineeMobileNo }}
                  }
                } @else {
                  —
                }
              </span>
            </div>
          }
          @if (choice.note) {
            <div class="item wide">
              <span class="label">{{ 'membership.Note' | translate }}</span>
              <span class="value">{{ choice.note }}</span>
            </div>
          }
        </div>
        <p class="hint">{{ 'membership.pendingExplanation' | translate }}</p>
      </div>
    }
  `,
  styles: [
    `
      .membership-preview {
        margin: 8px 0 16px;
      }
      h3 {
        margin: 0 0 12px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0 24px;
      }
      .item {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 0;
        border-bottom: 1px solid rgb(0 0 0 / 8%);
      }
      .wide {
        grid-column: 1 / -1;
      }
      .label {
        font-size: 12px;
        opacity: 0.65;
      }
      .hint {
        opacity: 0.7;
        margin: 12px 0 0;
      }
      @media (width <= 768px) {
        .grid {
          grid-template-columns: minmax(0, 1fr);
        }
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
  /** An organisation applying: no citizenship and no nominee (fineract-dbug ADR 0042) */
  @Input() organisation = false;
  @Input() citizenshipNumber: string | null = null;
  @Input() district: string | null = null;
  @Input() nomineeName: string | null = null;
  @Input() nomineeRelationship: string | null = null;
  @Input() nomineeMobileNo: string | null = null;
  @Input() receiptNumber: string | null = null;
  @Input() submittedOn: Date | null = null;
}
