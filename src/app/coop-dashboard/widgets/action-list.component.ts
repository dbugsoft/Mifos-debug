/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { DualDateComponent } from 'app/shared/dual-date/dual-date.component';
import { ActionCode, ActionGroup, ActionItem } from '../coop-dashboard.models';
import { grouped, shortAmount } from '../coop-format';

interface GroupLook {
  icon: string;
  tone: 'urgent' | 'soon' | 'info';
}

const LOOK: Record<ActionCode, GroupLook> = {
  LOANS_RECENTLY_OVERDUE: { icon: 'exclamation-circle', tone: 'urgent' },
  LOANS_DUE_THIS_WEEK: { icon: 'calendar-check', tone: 'soon' },
  FIXED_DEPOSITS_MATURING: { icon: 'piggy-bank', tone: 'soon' },
  DOCUMENTS_EXPIRING: { icon: 'id-badge', tone: 'soon' },
  LOANS_AWAITING_APPROVAL: { icon: 'tasks', tone: 'info' },
  LOANS_AWAITING_DISBURSAL: { icon: 'hand-holding-usd', tone: 'info' },
  MEMBERS_AWAITING_ACTIVATION: { icon: 'user-tie', tone: 'info' },
  KYC_INCOMPLETE: { icon: 'address-card', tone: 'soon' },
  CASH_WITH_CASHIERS: { icon: 'money-bill-wave', tone: 'info' }
};

/** Order on screen: what costs money if ignored comes first. */
const ORDER: ActionCode[] = [
  'LOANS_RECENTLY_OVERDUE',
  'LOANS_DUE_THIS_WEEK',
  'FIXED_DEPOSITS_MATURING',
  'DOCUMENTS_EXPIRING',
  'KYC_INCOMPLETE',
  'LOANS_AWAITING_APPROVAL',
  'LOANS_AWAITING_DISBURSAL',
  'MEMBERS_AWAITING_ACTIVATION',
  'CASH_WITH_CASHIERS'
];

/** What needs doing today, each group expandable to the records, each record linking to its screen. */
@Component({
  selector: 'mifosx-coop-action-list',
  standalone: true,
  imports: [
    FaIconComponent,
    TranslatePipe,
    RouterLink,
    DualDateComponent
  ],
  templateUrl: './action-list.component.html',
  styleUrl: './action-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActionListComponent {
  readonly open = signal<ActionCode | null>('LOANS_RECENTLY_OVERDUE');
  ordered: (ActionGroup & GroupLook)[] = [];
  today = '';

  @Input() set groups(groups: ActionGroup[] | null) {
    this.ordered = ORDER.map((code) => groups?.find((g) => g.code === code))
      .filter((g): g is ActionGroup => !!g)
      .map((g) => ({ ...g, ...LOOK[g.code] }));
  }

  @Input() set asOf(value: string | null) {
    this.today = value ?? '';
  }

  toggle(code: ActionCode): void {
    this.open.set(this.open() === code ? null : code);
  }

  link(item: ActionItem, code: ActionCode): any[] | null {
    if (item.entity === 'loan' && item.clientId) return [
        '/members',
        item.clientId,
        'loans-accounts',
        item.id,
        'general'
      ];
    if (item.entity === 'fixeddeposit' && item.clientId) return [
        '/members',
        item.clientId,
        'fixed-deposits-accounts',
        item.id
      ];
    if (code === 'DOCUMENTS_EXPIRING' && item.clientId) return [
        '/members',
        item.clientId,
        'identities'
      ];
    if (item.entity === 'client' && item.clientId) return [
        '/members',
        item.clientId,
        'general'
      ];
    if (item.entity === 'cashier') return [
        '/organization',
        'tellers'
      ];
    return null;
  }

  /** The API leaves out fields that are null, so a missing amount and a null one mean the same. */
  hasAmount(item: ActionItem): boolean {
    return item.amount !== null && item.amount !== undefined;
  }

  expired(item: ActionItem, code: ActionCode): boolean {
    return code === 'DOCUMENTS_EXPIRING' && !!item.date && item.date < this.today;
  }

  readonly short = shortAmount;
  readonly grouped = grouped;
}
