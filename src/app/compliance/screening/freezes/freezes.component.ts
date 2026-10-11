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
import { Freeze, ScreeningService } from '../screening.service';

type View = 'ACTIVE' | 'RELEASED' | 'ALL';

/** Funds held on a confirmed sanctions match, and those released (fineract-dbug #202, #203). */
@Component({
  selector: 'mifosx-freezes',
  templateUrl: './freezes.component.html',
  styleUrls: ['../screening-home/screening-home.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreezesComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private screening = inject(ScreeningService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly views: View[] = [
    'ACTIVE',
    'RELEASED',
    'ALL'
  ];
  readonly view = signal<View>('ACTIVE');
  readonly allowed = signal<boolean | null>(null);
  readonly loading = signal(false);
  readonly list = signal<Freeze[]>([]);

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          const v = (p.get('view') ?? 'ACTIVE').toUpperCase() as View;
          this.view.set(this.views.includes(v) ? v : 'ACTIVE');
          if (this.allowed()) {
            this.loading.set(true);
            this.screening.freezes(this.view()).subscribe({
              next: (f) => {
                this.list.set(f);
                this.loading.set(false);
              },
              error: () => this.loading.set(false)
            });
          }
        });
      });
  }

  show(view: View): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { view: view.toLowerCase() }, replaceUrl: true });
  }

  open(f: Freeze): void {
    this.router.navigate([
      '/compliance',
      'screening',
      'freezes',
      f.id
    ]);
  }
}
