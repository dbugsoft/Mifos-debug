/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ComplianceService } from '../compliance.service';
import { ReportType } from '../compliance.models';

/** A step of a report's life, as the page filters by it; ALL is every report still to go. */
export type StepFilter = 'ALL' | 'TO_MAKE' | 'NEEDS_FIXING' | 'READY' | 'SENT' | 'ACCEPTED';

const STEPS: { step: Exclude<StepFilter, 'ALL'>; count: 'toMake' | 'needsFixing' | 'ready' | 'sent' | 'accepted' }[] = [
  { step: 'TO_MAKE', count: 'toMake' },
  { step: 'NEEDS_FIXING', count: 'needsFixing' },
  { step: 'READY', count: 'ready' },
  { step: 'SENT', count: 'sent' },
  { step: 'ACCEPTED', count: 'accepted' }
];

/**
 * The top of a report tab (ADR-0062): the report's rule in one line, so a new officer learns it from the screen, and
 * the steps every report goes through with how many stand at each. A step pressed filters the page; pressed again,
 * everything still to go returns.
 */
@Component({
  selector: 'mifosx-report-steps',
  template: `
    <p class="explain">{{ 'compliance.reports.explain.' + type() | translate }}</p>
    @if (counts(); as c) {
      @if (c.late || c.soon) {
        <p class="late-line" [class.bad]="c.late">
          {{ 'compliance.reports.lateLine' | translate: { late: c.late, soon: c.soon } }}
        </p>
      }
    }
    <div class="steps" role="group" [attr.aria-label]="'compliance.reports.Steps' | translate">
      @for (s of shown(); track s.step) {
        <button
          type="button"
          class="step"
          [class.pressed]="step() === s.step"
          [attr.aria-pressed]="step() === s.step"
          (click)="step.set(step() === s.step ? 'ALL' : s.step)"
        >
          <span class="label">{{ 'compliance.reports.steps.' + s.step | translate }}</span>
          <span class="value">{{ s.value ?? '–' }}</span>
          <span class="sub">{{ 'compliance.reports.stepsSub.' + s.step | translate: { year: year() } }}</span>
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .explain {
        margin: 0;
        padding: 10px 14px;
        border-radius: 6px;
        background: var(--dk-primary-soft, #e0edf8);
        font-size: 0.875rem;
        max-width: 72ch;
      }
      .steps {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
      }
      .step {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 8px 12px;
        border: 1px solid rgb(127 127 127 / 25%);
        border-radius: 6px;
        background: var(--mat-sys-surface, var(--dk-surface, #fff));
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .step:hover {
        border-color: var(--dk-primary, #2460b9);
      }
      .step.pressed {
        border-color: var(--dk-primary, #2460b9);
        background: var(--dk-primary-soft, #e0edf8);
        outline: 1px solid var(--dk-primary, #2460b9);
      }
      .late-line {
        margin: 0;
        color: var(--dk-warning, #7a4a00);
        font-size: 0.875rem;
        font-weight: 600;
      }
      .late-line.bad {
        color: var(--dk-danger, #9f1f17);
      }
      .label {
        font-size: 0.8125rem;
      }
      .value {
        font-size: 1.375rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .sub {
        color: var(--mat-sys-on-surface-variant, #5b6578);
        font-size: 0.75rem;
      }
      @media (width <= 768px) {
        .steps {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `
  ],
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportStepsComponent {
  private compliance = inject(ComplianceService);

  readonly type = input.required<ReportType>();
  readonly step = model<StepFilter>('ALL');

  readonly year = computed(() => {
    const y = this.compliance.reportSteps()?.fiscalYear;
    return y ? `${y}/${String((y + 1) % 100).padStart(2, '0')}` : '';
  });

  readonly counts = computed(() => this.compliance.reportSteps()?.types[this.type()] ?? null);

  readonly shown = computed(() => {
    const counts = this.counts();
    return STEPS.map((s) => ({ step: s.step, value: counts ? counts[s.count] : null }));
  });
}
