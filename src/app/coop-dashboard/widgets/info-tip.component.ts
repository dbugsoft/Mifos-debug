/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

/** An ⓘ that explains a figure: on hover, on keyboard focus, and on a tap for touch screens. */
@Component({
  selector: 'mifosx-info-tip',
  standalone: true,
  imports: [
    MatTooltip,
    FaIconComponent,
    TranslatePipe
  ],
  template: `
    <button
      type="button"
      class="info"
      #tip="matTooltip"
      [matTooltip]="'coopDashboard.info.' + key | translate"
      matTooltipClass="coop-info-tooltip"
      matTooltipPosition="above"
      [attr.aria-label]="'coopDashboard.info.' + key | translate"
      (click)="$event.stopPropagation(); tip.toggle()"
    >
      <fa-icon icon="info-circle"></fa-icon>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        vertical-align: middle;
      }
      .info {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: none;
        color: var(--viz-muted);
        font-size: 13px;
        cursor: pointer;
      }
      .info:hover,
      .info:focus-visible {
        color: var(--coop-accent);
        background: var(--coop-accent-soft);
        outline: none;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InfoTipComponent {
  /** Key under coopDashboard.info in the translations. */
  @Input({ required: true }) key = '';
}
