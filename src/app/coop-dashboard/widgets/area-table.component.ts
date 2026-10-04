/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Area } from '../coop-dashboard.models';
import { grouped } from '../coop-format';

interface Row {
  area: Area;
  depth: number;
  total: number;
  open: boolean;
  key: string;
}

/** Members by province, opening to districts and local levels, with a male/female split bar on each row. */
@Component({
  selector: 'mifosx-coop-area-table',
  standalone: true,
  imports: [
    FaIconComponent,
    TranslatePipe
  ],
  template: `
    <div class="legend" aria-hidden="true">
      <span><i class="sw sw--1"></i>{{ 'coopDashboard.Male' | translate }}</span>
      <span><i class="sw sw--2"></i>{{ 'coopDashboard.Female' | translate }}</span>
      @if (hasOther) {
        <span><i class="sw sw--3"></i>{{ 'coopDashboard.Other' | translate }}</span>
      }
    </div>
    <table class="areas">
      <thead>
        <tr>
          <th>{{ 'coopDashboard.Area' | translate }}</th>
          <th class="num">{{ 'coopDashboard.Male' | translate }}</th>
          <th class="num">{{ 'coopDashboard.Female' | translate }}</th>
          <th class="num">{{ 'coopDashboard.Total' | translate }}</th>
          <th class="bar-col">
            <span class="visually-hidden">{{ 'coopDashboard.Split' | translate }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track row.key) {
          <tr [class.depth-1]="row.depth === 1" [class.depth-2]="row.depth === 2">
            <td>
              @if (row.area.children.length) {
                <button type="button" class="toggle" (click)="toggle(row)" [attr.aria-expanded]="row.open">
                  <fa-icon [icon]="row.open ? 'chevron-down' : 'chevron-right'"></fa-icon>
                  <span>{{ row.area.name }}</span>
                </button>
              } @else {
                <span class="leaf">{{ row.area.name }}</span>
              }
            </td>
            <td class="num">{{ grouped(row.area.members.male) }}</td>
            <td class="num">{{ grouped(row.area.members.female) }}</td>
            <td class="num strong">{{ grouped(row.total) }}</td>
            <td class="bar-col">
              <span
                class="bar"
                [style.width.%]="(row.total / max) * 100"
                [attr.title]="row.area.name + ': ' + grouped(row.total)"
              >
                <i class="seg seg--1" [style.flex-grow]="row.area.members.male"></i>
                <i class="seg seg--2" [style.flex-grow]="row.area.members.female"></i>
                <i class="seg seg--3" [style.flex-grow]="row.area.members.other"></i>
              </span>
            </td>
          </tr>
        }
      </tbody>
    </table>
    @if (notLocated) {
      <p class="note">{{ 'coopDashboard.without address' | translate: { count: grouped(notLocated) } }}</p>
    }
  `,
  styleUrl: './area-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AreaTableComponent {
  @Input() notLocated = 0;
  readonly rows = signal<Row[]>([]);
  max = 1;
  hasOther = false;
  private provinces: Area[] = [];

  @Input() set areas(areas: Area[] | null) {
    this.provinces = areas ?? [];
    this.max = Math.max(1, ...this.provinces.map((a) => this.total(a)));
    this.hasOther = this.provinces.some((a) => a.members.other > 0);
    // Open the largest province so the table isn't a wall of collapsed rows.
    this.rows.set(this.flatten(this.provinces, 0, new Set(this.provinces.slice(0, 1).map((p) => p.code))));
  }

  toggle(row: Row): void {
    const open = new Set(
      this.rows()
        .filter((r) => r.open)
        .map((r) => r.key)
    );
    if (open.has(row.key)) {
      [...open].filter((k) => k === row.key || k.startsWith(row.key + '/')).forEach((k) => open.delete(k));
    } else {
      open.add(row.key);
    }
    this.rows.set(this.flatten(this.provinces, 0, open));
  }

  private flatten(areas: Area[], depth: number, open: Set<string>, prefix = ''): Row[] {
    const out: Row[] = [];
    for (const area of areas) {
      const key = prefix + area.code;
      const isOpen = open.has(key);
      out.push({ area, depth, total: this.total(area), open: isOpen, key });
      if (isOpen) out.push(...this.flatten(area.children, depth + 1, open, key + '/'));
    }
    return out;
  }

  private total(a: Area): number {
    return a.members.male + a.members.female + a.members.other;
  }

  readonly grouped = grouped;
}
