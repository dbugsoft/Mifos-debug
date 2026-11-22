/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslateService } from '@ngx-translate/core';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { SettingsChange } from '../compliance.models';
import { isoDay } from '../settings/settings-group.component';
import { changeLine } from '../settings/settings-changes.component';
import { InspectionPack, InspectionPackService, fiscalYearLabel } from './inspection-pack.service';

/**
 * Our own duties › Inspection pack (fineract-dbug ADR-0065): everything the Department's inspector asks for, for the
 * period chosen, on one page to print or save as PDF. It names no member.
 */
@Component({
  selector: 'mifosx-inspection-pack',
  templateUrl: './inspection-pack.component.html',
  styleUrls: ['./inspection-pack.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    AdToBsPipe,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InspectionPackComponent {
  private service = inject(InspectionPackService);
  private translate = inject(TranslateService);

  readonly from = new FormControl<Date | null>(this.yearAgo());
  readonly to = new FormControl<Date | null>(new Date());
  readonly pack = signal<InspectionPack | null>(null);
  readonly loading = signal(false);
  readonly types = [
    'TTR',
    'STR',
    'SAR'
  ] as const;
  readonly yearLabel = fiscalYearLabel;

  make(): void {
    const from = this.from.value;
    const to = this.to.value;
    if (!from || !to) {
      return;
    }
    this.loading.set(true);
    this.service.pack(isoDay(new Date(from)), isoDay(new Date(to))).subscribe({
      next: (p) => {
        this.pack.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  print(): void {
    window.print();
  }

  /** A settings change in words: each setting as the rule it now sets. */
  lines(c: SettingsChange): string[] {
    return Object.entries(c.changes ?? {}).map(
      ([
        k,
        v
      ]) =>
        k === 'paymentClasses'
          ? this.translate.instant('compliance.pack.paymentClasses')
          : changeLine(this.translate, k, v === null || v === undefined ? null : String(v))
    );
  }

  planOf(p: InspectionPack, year: number): InspectionPack['actionPlans'][number] | undefined {
    return p.actionPlans.find((x) => x.fiscalYear === year);
  }

  lateAt(p: InspectionPack, type: string): number {
    return p.lateAtEnd.find((l) => l.type === type)?.count ?? 0;
  }

  grades(p: InspectionPack): { grade: string; count: number }[] {
    return [
      'HIGH',
      'MEDIUM',
      'LOW'
    ]
      .filter((g) => p.riskGradesToday[g] !== undefined)
      .map((g) => ({ grade: g, count: p.riskGradesToday[g] }));
  }

  private yearAgo(): Date {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    d.setDate(d.getDate() + 1);
    return d;
  }
}
