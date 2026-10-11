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
import { Pearls, PearlsGroup, PearlsIndicator } from '../coop-dashboard.models';
import { shortAmount } from '../coop-format';
import { InfoTipComponent } from './info-tip.component';

const GROUPS: PearlsGroup[] = [
  'P',
  'E',
  'A',
  'R',
  'L',
  'S'
];

/**
 * WOCCU's 45 PEARLS indicators (fineract-dbug ADR 0022), a group at a time: value against its goal range, whether the
 * goal is met, and, where the accounts aren't tagged yet, which tag to set.
 */
@Component({
  selector: 'mifosx-coop-pearls-card',
  standalone: true,
  imports: [
    FaIconComponent,
    TranslatePipe,
    RouterLink,
    InfoTipComponent
  ],
  templateUrl: './pearls-card.component.html',
  styleUrl: './pearls-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PearlsCardComponent {
  readonly groups = GROUPS;
  readonly group = signal<PearlsGroup>('P');
  private readonly data = signal<Pearls | null>(null);

  @Input() set pearls(value: Pearls | null) {
    this.data.set(value);
  }

  readonly summary = computed(() => this.data());

  readonly statusIcon: Record<string, string> = {
    MET: 'check-circle',
    NOT_MET: 'exclamation-circle',
    NO_DATA: 'tags',
    NOT_APPLICABLE: 'minus-circle',
    INFO: 'info-circle'
  };
  readonly rows = computed(() => this.data()?.indicators.filter((i) => i.group === this.group()) ?? []);

  counts(group: PearlsGroup): { met: number; total: number; noData: number } {
    const list = this.data()?.indicators.filter((i) => i.group === group) ?? [];
    return {
      met: list.filter((i) => i.status === 'MET').length,
      total: list.filter((i) => i.status === 'MET' || i.status === 'NOT_MET').length,
      noData: list.filter((i) => i.status === 'NO_DATA').length
    };
  }

  value(i: PearlsIndicator): string {
    if (i.value === null || i.value === undefined) return '–';
    return i.unit === 'AMOUNT' ? 'NPR ' + shortAmount(i.value) : `${Number(i.value).toFixed(1)}%`;
  }

  goal(i: PearlsIndicator): string | null {
    const min = i.goalMin ?? null;
    const max = i.goalMax ?? null;
    const unit = i.unit === 'AMOUNT' ? '' : '%';
    if (min !== null && max !== null) return min === max ? `${min}${unit}` : `${min}–${max}${unit}`;
    if (min !== null) return `≥ ${Number(min).toFixed(min % 1 ? 1 : 0)}${unit}`;
    if (max !== null)
      return i.unit === 'AMOUNT' && max === 0 ? '0' : `≤ ${Number(max).toFixed(max % 1 ? 1 : 0)}${unit}`;
    return null;
  }

  /** Position (0-100) of the value and the goal band on a scale fitted to both, for percentage indicators. */
  scale(i: PearlsIndicator): { value: number; from: number; to: number } | null {
    if (i.unit !== 'PERCENT' || i.value === null || i.value === undefined) return null;
    const min = i.goalMin ?? null;
    const max = i.goalMax ?? null;
    if (min === null && max === null) return null;
    const top = Math.max(Math.abs(i.value), max ?? 0, min ?? 0) * 1.25 || 1;
    const pos = (v: number) => Math.max(0, Math.min(100, (v / top) * 100));
    return { value: pos(i.value), from: pos(min ?? 0), to: max === null ? 100 : pos(max) };
  }
}
