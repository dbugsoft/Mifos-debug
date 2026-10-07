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
import { MatTableModule } from '@angular/material/table';
import { forkJoin, of, switchMap, catchError } from 'rxjs';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ComplianceService } from '../compliance.service';
import { AmlSettingsView, ComplianceAccess, LedgerStatus, TtrItem, TtrSummary, isoDate } from '../compliance.models';
import { DueChipComponent } from '../due-chip/due-chip.component';

/**
 * The compliance officer's home (fineract-dbug #198): deadlines first, then what needs a decision. Shows only what
 * this user's compliance permissions allow; parts of the design not built yet are not shown at all.
 */
@Component({
  selector: 'mifosx-compliance-home',
  templateUrl: './compliance-home.component.html',
  styleUrls: ['./compliance-home.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    MatTableModule,
    FormatNumberPipe,
    AdToBsPipe,
    DueChipComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComplianceHomeComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly access = signal<ComplianceAccess | null>(null);
  readonly summary = signal<TtrSummary | null>(null);
  readonly deadlines = signal<TtrItem[]>([]);
  readonly settings = signal<AmlSettingsView | null>(null);
  readonly ledger = signal<LedgerStatus | null>(null);

  readonly deadlineColumns = [
    'dueOn',
    'what',
    'member',
    'amount',
    'status'
  ];
  readonly isoDate = isoDate;

  ngOnInit(): void {
    this.compliance
      .loadAccess(true)
      .pipe(
        switchMap((access) => {
          this.access.set(access);
          const can = (...p: string[]) => p.some((x) => access.permissions.includes(x));
          return forkJoin({
            summary: can('READ_AMLCOMPLIANCE', 'READ_AMLSUMMARY')
              ? this.compliance.ttrSummary().pipe(catchError(() => of(null)))
              : of(null),
            deadlines: can('READ_AMLCOMPLIANCE')
              ? this.compliance.ttrItems().pipe(catchError(() => of([] as TtrItem[])))
              : of([] as TtrItem[]),
            settings: can('READ_AMLCOMPLIANCE', 'UPDATE_AMLSETTINGS')
              ? this.compliance.settings().pipe(catchError(() => of(null)))
              : of(null),
            ledger: can('READ_AMLCOMPLIANCE', 'UPDATE_AMLSETTINGS')
              ? this.compliance.ledgerStatus().pipe(catchError(() => of(null)))
              : of(null)
          });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        this.summary.set(data.summary);
        this.deadlines.set(data.deadlines.slice(0, 10));
        this.settings.set(data.settings);
        this.ledger.set(data.ledger);
        this.loading.set(false);
      });
  }

  can(...permissions: string[]): boolean {
    const a = this.access();
    return !!a && permissions.some((p) => a.permissions.includes(p));
  }
}
