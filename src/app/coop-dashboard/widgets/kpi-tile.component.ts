/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { InfoTipComponent } from './info-tip.component';

/** Up/down against a year earlier, and whether up is good news. */
export interface TileChange {
  value: number;
  goodWhenUp: boolean;
}

/** One headline figure: the value, its change on a year earlier, and its month-end trend. */
@Component({
  selector: 'mifosx-kpi-tile',
  standalone: true,
  imports: [
    FaIconComponent,
    TranslatePipe,
    InfoTipComponent
  ],
  template: `
    <div class="kpi" [class.kpi--loading]="loading">
      <div class="kpi__head">
        <span class="kpi__icon"><fa-icon [icon]="icon"></fa-icon></span>
        <span class="kpi__label">{{ label | translate }}</span>
        @if (info) {
          <mifosx-info-tip class="kpi__info" [key]="info"></mifosx-info-tip>
        }
      </div>
      @if (loading) {
        <div class="kpi__shimmer"></div>
      } @else {
        <div class="kpi__value">
          {{ value }}
          @if (unit) {
            <span class="kpi__unit">{{ unit }}</span>
          }
        </div>
        <div class="kpi__foot">
          @if (status) {
            <span class="kpi__status kpi__status--{{ status }}">
              <fa-icon
                [icon]="
                  status === 'good'
                    ? 'check-circle'
                    : status === 'warning'
                      ? 'exclamation-triangle'
                      : 'exclamation-circle'
                "
              ></fa-icon>
              {{ 'coopDashboard.status.' + status | translate }}
            </span>
          }
          @if (change) {
            <span class="kpi__change" [class.kpi__change--good]="isGood()" [class.kpi__change--bad]="!isGood()">
              <fa-icon [icon]="change.value >= 0 ? 'arrow-up' : 'arrow-down'"></fa-icon>
              {{ abs(change.value) }}%
            </span>
            <span class="kpi__note">{{ 'coopDashboard.vs last year' | translate }}</span>
          } @else if (note) {
            <span class="kpi__note">{{ note }}</span>
          }
        </div>
        @if (sparkPath) {
          <svg class="kpi__spark" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
            <path class="kpi__spark-area" [attr.d]="sparkArea"></path>
            <path class="kpi__spark-line" [attr.d]="sparkPath"></path>
            @for (p of sparkPoints; track $index) {
              <circle class="kpi__spark-hit" [attr.cx]="p.x" [attr.cy]="p.y" r="6">
                <title>{{ p.title }}</title>
              </circle>
            }
          </svg>
        }
      }
    </div>
  `,
  styleUrl: './kpi-tile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpiTileComponent {
  @Input() label = '';
  /** Explanation key under coopDashboard.info. */
  @Input() info = '';
  @Input() icon: any = 'chart-line';
  @Input() value = '';
  @Input() unit = '';
  @Input() note = '';
  @Input() loading = false;
  @Input() change: TileChange | null = null;
  @Input() status: 'good' | 'warning' | 'critical' | null = null;

  sparkPath = '';
  sparkArea = '';
  sparkPoints: { x: number; y: number; title: string }[] = [];

  /** Month-end values (null for months not started) and their labels. */
  @Input() set spark(input: { values: (number | null)[]; labels: string[]; format: (v: number) => string } | null) {
    this.sparkPath = '';
    this.sparkArea = '';
    this.sparkPoints = [];
    const values = input?.values.map((v, i) => ({ v, i })).filter((p) => p.v != null) as { v: number; i: number }[];
    if (!input || !values || values.length < 2) return;
    const min = Math.min(...values.map((p) => p.v));
    const max = Math.max(...values.map((p) => p.v));
    const span = max - min || 1;
    const last = values[values.length - 1].i || 1;
    this.sparkPoints = values.map((p) => ({
      x: 4 + (p.i / last) * 112,
      y: 28 - ((p.v - min) / span) * 24,
      title: `${input.labels[p.i]}: ${input.format(p.v)}`
    }));
    this.sparkPath = this.sparkPoints.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const first = this.sparkPoints[0];
    const end = this.sparkPoints[this.sparkPoints.length - 1];
    this.sparkArea = `${this.sparkPath} L${end.x.toFixed(1)},32 L${first.x.toFixed(1)},32 Z`;
  }

  isGood(): boolean {
    return !!this.change && this.change.value >= 0 === this.change.goodWhenUp;
  }

  abs(v: number): string {
    return Math.abs(v).toFixed(1);
  }
}
