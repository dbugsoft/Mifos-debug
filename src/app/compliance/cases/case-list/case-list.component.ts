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
import { ComplianceService } from '../../compliance.service';
import { DueChipComponent } from '../../due-chip/due-chip.component';
import { Case, CasesService } from '../cases.service';

type View = 'OPEN' | 'DECIDED_REPORT' | 'FILED' | 'DECIDED_NO_REPORT' | 'ALL';

/** Compliance cases: open, reports to file (with their clock), filed, closed without a report (fineract-dbug #135). */
@Component({
  selector: 'mifosx-case-list',
  templateUrl: './case-list.component.html',
  styleUrls: ['../alert-list/alert-list.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatProgressBar,
    AdToBsPipe,
    DueChipComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaseListComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private cases = inject(CasesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly views: View[] = [
    'OPEN',
    'DECIDED_REPORT',
    'FILED',
    'DECIDED_NO_REPORT',
    'ALL'
  ];
  readonly view = signal<View>('OPEN');
  readonly allowed = signal<boolean | null>(null);
  readonly loading = signal(false);
  readonly list = signal<Case[]>([]);

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          const v = (p.get('view') ?? 'OPEN').toUpperCase() as View;
          this.view.set(this.views.includes(v) ? v : 'OPEN');
          if (this.allowed()) {
            this.load();
          }
        });
      });
  }

  show(view: View): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { view: view.toLowerCase() }, replaceUrl: true });
  }

  open(k: Case): void {
    this.router.navigate([
      '/compliance',
      'cases',
      k.id
    ]);
  }

  private load(): void {
    this.loading.set(true);
    this.cases.cases(this.view()).subscribe({
      next: (c) => {
        this.list.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.list.set([]);
        this.loading.set(false);
      }
    });
  }
}
