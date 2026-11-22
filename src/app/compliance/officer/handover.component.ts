/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { CompliancePlace, TodayItem } from '../compliance.models';
import { COMPLIANCE_PLACES } from '../compliance-places';
import { whatToDo } from '../compliance-home/compliance-home.component';
import { Handover, OfficerService } from './officer.service';

/** Deadlines shown on the page; the rest are counted. */
const DEADLINES = 40;

/**
 * The page a new compliance officer starts from (fineract-dbug ADR-0064): who is officer, what waits and by when, the
 * open cases, and what the last board review said. Printed from the browser.
 */
@Component({
  selector: 'mifosx-handover',
  templateUrl: './handover.component.html',
  styleUrls: ['./handover.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HandoverComponent implements OnInit {
  private officer = inject(OfficerService);

  readonly handover = signal<Handover | null>(null);
  readonly failed = signal(false);
  readonly places = computed(() => {
    const p = this.handover()?.today.places ?? {};
    return (Object.keys(p) as CompliancePlace[]).map((place) => ({
      label: COMPLIANCE_PLACES[place]?.label ?? place,
      ...p[place]!
    }));
  });
  readonly deadlines = computed(() => (this.handover()?.today.items ?? []).filter((i) => i.dueOn).slice(0, DEADLINES));
  readonly moreDeadlines = computed(() => {
    const all = (this.handover()?.today.items ?? []).filter((i) => i.dueOn).length;
    return Math.max(0, all - DEADLINES) + (this.handover()?.today.more ?? 0);
  });
  readonly covers = computed(() => (this.handover()?.covers ?? []).filter((c) => c.status !== 'OVER'));

  ngOnInit(): void {
    this.officer.handover().subscribe({ next: (h) => this.handover.set(h), error: () => this.failed.set(true) });
  }

  what(i: TodayItem) {
    return whatToDo(i);
  }

  print(): void {
    window.print();
  }
}
