/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { ComplianceService } from '../compliance.service';
import { CompliancePlace } from '../compliance.models';
import { COMPLIANCE_PLACES, PlaceTab } from '../compliance-places';

/**
 * One place of the Compliance menu (fineract-dbug ADR 0060): its pages as tabs above the page, so everything the
 * officer does for one job is one click apart. A place with one page shows no tabs.
 */
@Component({
  selector: 'mifosx-compliance-place',
  template: `
    @if (tabs().length > 1) {
      <nav mat-tab-nav-bar class="place-tabs" [tabPanel]="panel" [attr.aria-label]="label() | translate">
        @for (tab of tabs(); track tab.label) {
          <a
            mat-tab-link
            [routerLink]="tab.path"
            routerLinkActive
            #active="routerLinkActive"
            [active]="active.isActive"
          >
            {{ tab.label | translate }}
            @if (badge(tab); as b) {
              <span class="count" [class]="b.tone">{{ b.value }}</span>
            }
          </a>
        }
      </nav>
    }
    <mat-tab-nav-panel #panel><router-outlet></router-outlet></mat-tab-nav-panel>
  `,
  styles: [
    `
      .place-tabs {
        margin: 0 16px;
      }
      .count {
        margin-left: 6px;
        padding: 0 6px;
        border-radius: 9px;
        background: var(--dk-fill, #e4e9f2);
        color: var(--dk-text, #1d2433);
        font-size: 0.6875rem;
        font-weight: 700;
        line-height: 17px;
        font-variant-numeric: tabular-nums;
      }
      .count.bad {
        background: var(--dk-danger, #d84a3f);
        color: #fff;
      }
      .count.warn {
        background: var(--dk-warning-soft, #fff0d1);
        color: var(--dk-warning, #7a4a00);
      }
    `
  ],
  imports: [
    MatTabNav,
    MatTabLink,
    MatTabNavPanel,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompliancePlaceComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private authentication = inject(AuthenticationService);
  private place = toSignal(inject(ActivatedRoute).data.pipe(map((d) => d['place'] as CompliancePlace)));

  readonly label = computed(() => COMPLIANCE_PLACES[this.place() ?? 'REPORTS'].label);
  readonly tabs = computed(() => {
    // read so the tabs follow the access answer
    this.compliance.access();
    const place = this.place();
    return place ? COMPLIANCE_PLACES[place].tabs.filter((tab) => this.shows(tab)) : [];
  });

  ngOnInit(): void {
    // the counts on Reports to FIU-Nepal's tabs; its pages renew them after each step
    if (this.place() === 'REPORTS' && this.compliance.can('READ_AMLCOMPLIANCE')) {
      this.compliance.loadReportSteps().subscribe();
    }
  }

  /** What waits behind a tab: red if any is late, amber if due within 3 days. */
  badge(tab: PlaceTab): { value: number; tone: string } | null {
    const c = tab.count ? this.compliance.reportSteps()?.types[tab.count] : null;
    if (!c) {
      return null;
    }
    const value = c.toMake + c.needsFixing + c.ready;
    return value ? { value, tone: c.late ? 'count bad' : c.soon ? 'count warn' : 'count' } : null;
  }

  private shows(tab: PlaceTab): boolean {
    if (tab.permission) {
      const held: string[] = this.authentication.getCredentials()?.permissions ?? [];
      return (
        held.includes('ALL_FUNCTIONS') ||
        held.includes(tab.permission) ||
        (tab.permission.startsWith('READ_') && held.includes('ALL_FUNCTIONS_READ'))
      );
    }
    return this.compliance.can(...(tab.compliance ?? COMPLIANCE_PLACES[this.place()!].compliance));
  }
}
