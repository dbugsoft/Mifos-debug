/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { ComplianceService } from '../../compliance.service';
import { ALERT_RULES, Alert, CasesService } from '../cases.service';

type View = 'OPEN' | 'ESCALATED' | 'CLOSED' | 'ALL';

/** Monitoring alerts and staff concerns, high-risk members first (fineract-dbug #133, #135). */
@Component({
  selector: 'mifosx-alert-list',
  templateUrl: './alert-list.component.html',
  styleUrls: ['./alert-list.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatProgressBar,
    AdToBsPipe,
    FormatNumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlertListComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private cases = inject(CasesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly views: View[] = [
    'OPEN',
    'ESCALATED',
    'CLOSED',
    'ALL'
  ];
  readonly rules = ALERT_RULES;
  readonly view = signal<View>('OPEN');
  readonly rule = signal<string | null>(null);
  readonly allowed = signal<boolean | null>(null);
  readonly loading = signal(false);
  readonly alerts = signal<Alert[]>([]);

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          const v = (p.get('view') ?? 'OPEN').toUpperCase() as View;
          this.view.set(this.views.includes(v) ? v : 'OPEN');
          this.rule.set(p.get('rule'));
          if (this.allowed()) {
            this.load();
          }
        });
      });
  }

  show(view: View | null, rule?: string | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: (view ?? this.view()).toLowerCase(), rule: rule === undefined ? this.rule() : rule },
      replaceUrl: true
    });
  }

  open(a: Alert): void {
    this.router.navigate([
      '/compliance',
      'alerts',
      a.id
    ]);
  }

  private load(): void {
    this.loading.set(true);
    this.cases.alerts(this.view(), this.rule()).subscribe({
      next: (a) => {
        this.alerts.set(a);
        this.loading.set(false);
      },
      error: () => {
        this.alerts.set([]);
        this.loading.set(false);
      }
    });
  }
}
