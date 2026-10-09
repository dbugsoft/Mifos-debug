/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { ComplianceService } from '../../compliance.service';
import { Grade } from '../../compliance.models';
import { RiskService } from '../risk.service';
import { Edd, RiskListRow } from '../risk.models';

type View = Grade | 'REVIEW_DUE' | 'EDD';

/**
 * Members by risk grade, those due for review, and those under enhanced checks (fineract-dbug #129, #201, #136).
 * A row opens the member's compliance profile.
 */
@Component({
  selector: 'mifosx-risk-list',
  templateUrl: './risk-list.component.html',
  styleUrls: ['./risk-list.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RiskListComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private risk = inject(RiskService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly views: View[] = [
    'HIGH',
    'MEDIUM',
    'NORMAL',
    'REVIEW_DUE',
    'EDD'
  ];
  readonly view = signal<View>('HIGH');
  readonly allowed = signal<boolean | null>(null);
  readonly loading = signal(false);
  readonly rows = signal<RiskListRow[]>([]);
  readonly edd = signal<Edd[]>([]);
  readonly search = signal('');
  readonly visibleRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.rows().filter((r) => r.name.toLowerCase().includes(q) || (r.accountNo ?? '').includes(q))
      : this.rows();
  });
  readonly visibleEdd = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.edd().filter((r) => r.name.toLowerCase().includes(q) || (r.accountNo ?? '').includes(q))
      : this.edd();
  });

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          const v = (p.get('view') ?? 'HIGH').toUpperCase() as View;
          this.view.set(this.views.includes(v) ? v : 'HIGH');
          if (this.allowed()) {
            this.load();
          }
        });
      });
  }

  show(v: View): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { view: v.toLowerCase() }, replaceUrl: true });
  }

  open(clientId: number): void {
    this.router.navigate([
      '/compliance',
      'members',
      clientId
    ]);
  }

  bases(row: RiskListRow): string[] {
    return (row.bases ?? '').split(',').filter((b) => !!b);
  }

  private load(): void {
    this.loading.set(true);
    const v = this.view();
    if (v === 'EDD') {
      this.risk.eddList().subscribe({
        next: (e) => {
          this.edd.set(e);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
      return;
    }
    this.risk.list(v === 'REVIEW_DUE' ? null : v, v === 'REVIEW_DUE', 0, 500).subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      }
    });
  }
}
