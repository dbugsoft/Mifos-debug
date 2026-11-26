/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { RouterLinkActive } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanFile } from '../loan-file.service';

/**
 * The tabs of one loan's file (Documents, Appraisal, Approval). Given the file, it also shows who and what the loan
 * is, for the tabs that have no header of their own.
 */
@Component({
  selector: 'mifosx-file-tabs',
  template: `
    @if (file(); as f) {
      <div class="title-row">
        <h2>
          <a [routerLink]="['/members', f.clientId]">{{ f.clientName }}</a>
        </h2>
        <span class="muted">{{ f.accountNo }} · {{ f.product }}</span>
        <span class="chip">{{ 'lending.stage.' + f.stage | translate }}</span>
      </div>
    }
    <nav mat-tab-nav-bar [tabPanel]="panel">
      @for (t of tabs; track t.path) {
        <a
          mat-tab-link
          [routerLink]="link(t.path)"
          routerLinkActive
          #rla="routerLinkActive"
          [routerLinkActiveOptions]="{ exact: true }"
          [active]="rla.isActive"
        >
          {{ t.label | translate }}
        </a>
      }
    </nav>
    <mat-tab-nav-panel #panel></mat-tab-nav-panel>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 16px;
    }

    .title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
      margin-bottom: 8px;

      h2 {
        margin: 0;
      }

      a {
        color: var(--dk-primary, #2460b9);
        text-decoration: none;
      }
    }

    .muted {
      color: var(--mat-sys-on-surface-variant);
    }

    .chip {
      padding: 0 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 20px;
      color: var(--dk-success, #1b6b2a);
      background: var(--dk-success-soft, #e3f3e6);
    }
  `,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTabNav,
    MatTabLink,
    MatTabNavPanel,
    RouterLinkActive
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileTabsComponent {
  readonly loanId = input.required<number | string>();
  readonly file = input<LoanFile | null>(null);

  readonly tabs = [
    { path: [] as string[], label: 'lending.file.Documents' },
    { path: ['appraisal'], label: 'lending.tabs.Appraisal' }
  ];

  link(path: string[]): (string | number)[] {
    return [
      '/lending/files',
      this.loanId(),
      ...path
    ];
  }
}
