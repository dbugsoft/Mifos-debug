/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { GoamlFix, GoamlGap, GoamlReport } from '../compliance.models';

/** One gap as the screen shows it: its words and where to fix it. */
export interface ShownGap {
  text: string;
  link: string[] | null;
  linkLabel: string | null;
}

/** Where each kind of fix is made. Settings move into Compliance in a later step; the links follow them there. */
export function fixLink(fix: GoamlFix, clientId?: number | null): string[] | null {
  switch (fix) {
    case 'MEMBER':
      return clientId ? [
            '/members',
            String(clientId)
          ] : null;
    case 'AML_SETTINGS':
    case 'GOAML_CODES':
      return [
        '/system',
        'configurations'
      ];
    case 'OFFICER':
      return [
        '/compliance',
        'governance'
      ];
    default:
      return null;
  }
}

/**
 * A gap in the reader's language (fineract-dbug #289): translated by its code with its arguments, falling back to the
 * backend's English for a code this screen does not know yet. A director's gap on an organisation's report is the
 * director's own gap, said of the director.
 */
export function gapText(translate: TranslateService, gap: GoamlGap): string {
  const params: Record<string, string> = {};
  (gap.arguments ?? []).forEach((a, i) => (params['a' + i] = a));
  const director = gap.code.startsWith('organisation.director.');
  const code = director ? gap.code.slice('organisation.director.'.length) : gap.code;
  const key = 'compliance.gap.' + code;
  const text = translate.instant(key, params);
  if (text === key) {
    return gap.message;
  }
  return director ? translate.instant('compliance.gap.director', { text }) : text;
}

/** A report's problems (keep it a draft) and warnings (filled in, but check), each linked to where it is fixed. */
@Component({
  selector: 'mifosx-goaml-gaps',
  template: `
    @if (problems().length) {
      <div class="gaps problems" role="status">
        <span class="gaps-title">{{ 'compliance.gap.Before it can be sent' | translate }}</span>
        <ul>
          @for (g of problems(); track $index) {
            <li>
              {{ g.text }}
              @if (g.link) {
                <a [routerLink]="g.link">{{ g.linkLabel! | translate }}</a>
              }
            </li>
          }
        </ul>
      </div>
    }
    @if (warnings().length) {
      <details class="gaps warnings" [open]="warnings().length <= 2">
        <summary>{{ 'compliance.gap.Filled in, but check' | translate: { count: warnings().length } }}</summary>
        <ul>
          @for (g of warnings(); track $index) {
            <li>
              {{ g.text }}
              @if (g.link) {
                <a [routerLink]="g.link">{{ g.linkLabel! | translate }}</a>
              }
            </li>
          }
        </ul>
      </details>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .gaps ul {
        margin: 4px 0 0;
        padding-left: 20px;
      }
      .gaps li + li {
        margin-top: 2px;
      }
      .gaps a {
        margin-left: 6px;
        font-weight: 600;
        white-space: nowrap;
      }
      .problems {
        padding: 8px 12px;
        border: 1px solid var(--dk-warning, #f0d08a);
        border-radius: 6px;
        background: var(--dk-warning-soft, #fff4dc);
        font-size: 0.875rem;
      }
      .gaps-title {
        font-weight: 600;
      }
      .warnings {
        color: var(--mat-sys-on-surface-variant, #5b6578);
        font-size: 0.8125rem;
      }
      .warnings summary {
        cursor: pointer;
      }
    `
  ],
  imports: [
    RouterLink,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoamlGapsComponent {
  private translate = inject(TranslateService);

  readonly report = input.required<GoamlReport>();

  readonly problems = computed(() => {
    const r = this.report();
    // a report made before the details existed has its problems in plain English only
    return r.problemDetails?.length
      ? r.problemDetails.map((g) => this.show(g))
      : (r.problems ?? []).map((text): ShownGap => ({ text, link: null, linkLabel: null }));
  });

  readonly warnings = computed(() => {
    const r = this.report();
    return r.warningDetails?.length
      ? r.warningDetails.map((g) => this.show(g))
      : (r.warnings ?? []).map((text): ShownGap => ({ text, link: null, linkLabel: null }));
  });

  private show(g: GoamlGap): ShownGap {
    const link = fixLink(g.fix, g.clientId);
    return { text: gapText(this.translate, g), link, linkLabel: link ? 'compliance.gap.fix.' + g.fix : null };
  }
}
