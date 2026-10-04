/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { grouped, percent, shortAmount } from '../coop-format';

Chart.register(...registerables);

export interface ChartSeries {
  name: string;
  data: (number | null)[];
  /** Categorical slot 1-3 (fixed order, never cycled), or a CSS variable name for a per-bar colour list. */
  slot?: 1 | 2 | 3;
}

export type ChartFormat = 'amount' | 'count' | 'percent';

/**
 * A chart in the dashboard's style: Mifos theme colours from CSS variables (so dark mode gets its own validated steps),
 * thin rounded bars, one axis, a legend for two or more series, quiet grid, and formatted tooltips.
 */
@Component({
  selector: 'mifosx-coop-chart',
  standalone: true,
  template: `<div class="coop-chart" [style.height.px]="height">
    <canvas #canvas [attr.aria-label]="ariaLabel" role="img"></canvas>
  </div>`,
  styles: [
    `
      :host {
        display: block;
      }
      .coop-chart {
        position: relative;
        width: 100%;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoopChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  private host = inject(ElementRef<HTMLElement>);

  @Input() labels: string[] = [];
  @Input() series: ChartSeries[] = [];
  @Input() kind: 'bar' | 'line' | 'hbar' = 'bar';
  @Input() stacked = false;
  @Input() format: ChartFormat = 'amount';
  @Input() height = 240;
  /** Extra tooltip line per label, e.g. the AD dates of a BS month. */
  @Input() notes: string[] | null = null;
  /** Write each bar's value at its end (single-series horizontal bars). */
  @Input() valueLabels = false;
  /** One colour per bar (single series), as CSS variable names. */
  @Input() barColors: string[] | null = null;
  @Input() ariaLabel = '';

  @ViewChild('canvas') private canvas?: ElementRef<HTMLCanvasElement>;
  private chart?: any;
  private themeObserver?: MutationObserver;

  ngAfterViewInit(): void {
    this.render();
    // Re-colour when the app switches between light and dark.
    this.themeObserver = new MutationObserver(() => this.render());
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnChanges(): void {
    if (this.canvas) this.render();
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.chart?.destroy();
  }

  private token(name: string): string {
    return getComputedStyle(this.host.nativeElement).getPropertyValue(name).trim();
  }

  private formatValue(v: number | null | undefined): string {
    if (this.format === 'percent') return percent(v);
    if (this.format === 'count') return grouped(v);
    return shortAmount(v);
  }

  private render(): void {
    if (!this.canvas) return;
    this.chart?.destroy();
    const ink = this.token('--viz-ink-2') || '#52514e';
    const muted = this.token('--viz-muted') || '#898781';
    const grid = this.token('--viz-grid') || '#e1e0d9';
    const surface = this.token('--viz-surface') || '#ffffff';
    const horizontal = this.kind === 'hbar';
    const isLine = this.kind === 'line';
    const datasets = this.series.map((s, i) => {
      const color = this.token(`--viz-${s.slot ?? i + 1}`);
      const perBar = this.barColors?.map((c) => this.token(c));
      return isLine
        ? {
            label: s.name,
            data: s.data,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: color,
            pointBorderColor: surface,
            pointBorderWidth: 2,
            tension: 0.25,
            spanGaps: false
          }
        : {
            label: s.name,
            data: s.data,
            backgroundColor: perBar ?? color,
            borderColor: surface,
            borderWidth: this.stacked ? { top: 0, bottom: 0, left: horizontal ? 0 : 1, right: horizontal ? 2 : 1 } : 0,
            borderRadius: 4,
            borderSkipped: 'start' as const,
            maxBarThickness: horizontal ? 18 : 22,
            barPercentage: 0.72,
            categoryPercentage: 0.78
          };
    });
    const valueAxis = {
      stacked: this.stacked,
      beginAtZero: true,
      grid: { color: grid, drawTicks: false },
      border: { display: false },
      ticks: { color: muted, padding: 6, maxTicksLimit: 5, callback: (v: any) => this.formatValue(Number(v)) }
    };
    const categoryAxis = {
      stacked: this.stacked,
      grid: { display: false },
      border: { color: grid },
      ticks: { color: ink, padding: 4, autoSkip: true, maxRotation: 0 }
    };
    const valueLabelPlugin: any = {
      id: 'coopValueLabels',
      afterDatasetsDraw: (chart: any) => {
        if (!this.valueLabels) return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = ink;
        ctx.font = '600 12px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        chart.getDatasetMeta(0).data.forEach((bar: any, i: number) => {
          const v = chart.data.datasets[0].data[i] as number;
          if (v == null) return;
          ctx.fillText(this.formatValue(v), bar.x + 6, bar.y);
        });
        ctx.restore();
      }
    };
    const config: any = {
      type: isLine ? 'line' : 'bar',
      data: { labels: this.labels, datasets: datasets as any },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { right: this.valueLabels ? 64 : 4 } },
        animation: { duration: 350 },
        plugins: {
          legend: {
            display: this.series.length >= 2,
            position: 'top',
            align: 'end',
            labels: {
              color: ink,
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: this.token('--viz-tooltip') || '#303135',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 8,
            boxPadding: 4,
            callbacks: {
              afterTitle: (items: any[]) => (this.notes ? this.notes[items[0].dataIndex] || '' : ''),
              label: (item: any) => ` ${item.dataset.label}: ${this.formatValue(item.raw as number)}`
            }
          }
        },
        scales: horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis }
      } as any,
      plugins: [valueLabelPlugin]
    };
    this.chart = new Chart(this.canvas.nativeElement, config);
  }
}
