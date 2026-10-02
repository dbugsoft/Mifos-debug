/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { DualDateComponent } from 'app/shared/dual-date/dual-date.component';
import { ActionCode, ActionGroup, ActionItem } from '../coop-dashboard.models';
import { grouped, shortAmount } from '../coop-format';
import { InfoTipComponent } from './info-tip.component';

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

const FOLLOW_UP: ActionCode[] = [
  'LOANS_RECENTLY_OVERDUE',
  'LOANS_DUE_THIS_WEEK',
  'FIXED_DEPOSITS_MATURING',
  'DOCUMENTS_EXPIRING',
  'KYC_INCOMPLETE'
];

/** What needs doing today: a tile per kind of task, and the chosen one's records underneath, each linking to its screen. */
@Component({
  selector: 'mifosx-coop-action-list',
  standalone: true,
  imports: [
    FaIconComponent,
    TranslatePipe,
    RouterLink,
    DualDateComponent,
    InfoTipComponent
  ],
  templateUrl: './action-list.component.html',
  styleUrl: './action-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActionListComponent {
  private readonly chosen = signal<ActionCode | null>(null);
  private readonly groupList = signal<(ActionGroup & GroupLook)[]>([]);
  /** The chosen group, or the first one with anything in it. */
  readonly selected = computed(() => {
    const list = this.groupList();
    return list.find((g) => g.code === this.chosen() && g.count) ?? list.find((g) => g.count) ?? null;
  });

  get ordered(): (ActionGroup & GroupLook)[] {
    return this.groupList();
  }

  /** Tasks that mean contacting members, then work waiting on the office. */
  readonly rows = computed(() => [
    { key: 'Follow up with members', groups: this.groupList().filter((g) => FOLLOW_UP.includes(g.code)) },
    { key: 'Waiting on the office', groups: this.groupList().filter((g) => !FOLLOW_UP.includes(g.code)) }
  ]);
  today = '';

  @Input() set groups(groups: ActionGroup[] | null) {
    this.groupList.set(
      ORDER.map((code) => groups?.find((g) => g.code === code))
        .filter((g): g is ActionGroup => !!g)
        .map((g) => ({ ...g, ...LOOK[g.code] }))
    );
  }

  /** The office the dashboard shows, carried to the full list. */
  @Input() officeId: number | null = null;

  @Input() set asOf(value: string | null) {
    this.today = value ?? '';
  }

  select(code: ActionCode): void {
    this.chosen.set(code);
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
