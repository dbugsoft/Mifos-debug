/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ComplianceService } from '../compliance.service';
import { SettingsChange } from '../compliance.models';
import { SentenceField, sentenceOf, sentenceParts } from './settings-sentences';

/** One change as read: each setting's sentence with its new value in place. */
interface ShownChange {
  at: string;
  who: string;
  lines: string[];
  reason: string | null;
  text: string | null;
}

/**
 * Compliance › Settings › Changes (ADR-0063): who changed which rule, when, and why, newest first. Each change reads
 * as the rule it set ("Report a member's cash of Rs 9,00,000 or more in one day").
 */
@Component({
  selector: 'mifosx-settings-changes',
  template: `
    <div class="compliance-page">
      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      <section class="frame">
        <h2 class="legend">{{ 'compliance.nav.Changes' | translate }}</h2>
        @if (!loading() && !changes().length) {
          <p class="hint">{{ 'compliance.settings.No changes yet' | translate }}</p>
        }
        <ol class="changes">
          @for (c of changes(); track $index) {
            <li class="change">
              <p class="when">
                <strong>{{ c.at.slice(0, 10) | adToBs }}</strong>
                <span class="hint">{{ c.at.slice(11, 16) }} · {{ c.who }}</span>
              </p>
              @if (c.text) {
                <p class="line">{{ 'compliance.settings.Recorded as' | translate }} {{ c.text }}</p>
              }
              <ul>
                @for (l of c.lines; track $index) {
                  <li>{{ l }}</li>
                }
              </ul>
              <p class="line why">
                @if (c.reason) {
                  <span class="label">{{ 'compliance.settings.Why' | translate }}</span> {{ c.reason }}
                } @else if (!c.text) {
                  {{ 'compliance.settings.No reason given' | translate }}
                }
              </p>
            </li>
          }
        </ol>
      </section>
    </div>
  `,
  styles: `
    @use '../compliance' as compliance;
    @include compliance.page;

    .changes {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .change {
      padding: 12px 0;
      border-bottom: 1px solid var(--dk-border, #e2e8f0);

      &:last-child {
        border-bottom: 0;
      }

      ul {
        margin: 6px 0;
        padding-left: 20px;
      }
    }

    .when {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: baseline;
      margin: 0;
    }

    .line {
      margin: 4px 0 0;
      color: var(--dk-text-2, #475569);
      font-size: 0.875rem;
    }

    .label {
      font-weight: 600;
    }
  `,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsChangesComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly changes = signal<ShownChange[]>([]);

  ngOnInit(): void {
    forkJoin([
      this.compliance.settingsHistory(),
      this.compliance.settings()
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([
          history,
          view
        ]) => {
          const types = new Map(
            view.paymentTypes.map((t) => [
              String(t.id),
              t.name
            ])
          );
          this.changes.set(history.map((c) => this.shown(c, types)));
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  private shown(c: SettingsChange, types: Map<string, string>): ShownChange {
    const lines: string[] = [];
    for (const [
      key,
      value
    ] of Object.entries(c.changes ?? {})) {
      if (key === 'paymentClasses' && value && typeof value === 'object') {
        for (const [
          id,
          cls
        ] of Object.entries(value)) {
          lines.push(
            this.translate.instant('compliance.settings.paymentClassChange', {
              type: types.get(id) ?? '#' + id,
              class: this.translate.instant('compliance.cashClass.' + cls)
            })
          );
        }
      } else {
        lines.push(changeLine(this.translate, key, value as string | null));
      }
    }
    return {
      at: c.at ?? '',
      who: c.name || c.username || '',
      lines,
      reason: c.reason,
      text: c.text
    };
  }
}

/** A changed setting as its sentence with the new value in place; a setting with no sentence as `name: value`. */
export function changeLine(translate: TranslateService, key: string, value: string | null): string {
  const s = sentenceOf(key);
  if (!s) {
    return `${key}: ${value ?? '—'}`;
  }
  const words: string = translate.instant('compliance.settings.sentence.' + s.id);
  const field = s.fields.find((f) => f.key === key)!;
  if (field.kind === 'switch') {
    const state = translate.instant(value === 'true' ? 'compliance.settings.on' : 'compliance.settings.off');
    return `${words} (${state})`;
  }
  return sentenceParts(words, s.fields)
    .map((p) => ('text' in p ? p.text : p.field.key === key ? shownValue(translate, p.field, value) : '…'))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function shownValue(translate: TranslateService, f: SentenceField, value: string | null): string {
  if (value === null || value === '') {
    return translate.instant('compliance.settings.empty');
  }
  if (f.kind === 'choice') {
    return translate.instant('compliance.settings.choice.' + value);
  }
  if (f.kind === 'amount') {
    return 'Rs ' + Number(value).toLocaleString('en-IN');
  }
  if (f.kind === 'percent') {
    return value + '%';
  }
  return value;
}
