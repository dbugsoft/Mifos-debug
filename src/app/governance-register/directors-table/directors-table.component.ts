/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { GovernanceRegisterService } from '../governance-register.service';
import { DirectorsTable } from '../governance-register.models';
import { isoDate } from '../governance-register.utils';

/** The board on a day, as the yearly return lists it (fineract-dbug #138). Advisers are not in it. */
@Component({
  selector: 'mifosx-directors-table',
  templateUrl: './directors-table.component.html',
  styleUrls: ['./directors-table.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatIcon,
    MatProgressBar,
    AdToBsPipe,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DirectorsTableComponent implements OnInit {
  private governance = inject(GovernanceRegisterService);

  readonly table = signal<DirectorsTable | null>(null);
  readonly loading = signal(false);
  readonly asOf = new FormControl<Date | null>(null);
  readonly today = new Date();

  readonly ranOutCount = computed(() => this.table()?.directors.filter((d) => d.remaining?.ranOut).length ?? 0);

  ngOnInit(): void {
    this.load();
    this.asOf.valueChanges.subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.governance.directors(isoDate(this.asOf.value) ?? undefined).subscribe({
      next: (t) => {
        this.table.set(t);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  positionLabel(code: string, name: string): string {
    return code.startsWith('OWN_') ? name : `governanceRegister.position.${code}`;
  }
}
