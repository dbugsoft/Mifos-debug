/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslateService } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { BsCalendarService } from 'app/core/bs-calendar/bs-calendar.service';
import { ElectionsService } from '../../elections.service';
import { saveBlob } from '../../elections.utils';
import { Voter } from '../../elections.models';

const PAGE_SIZE = 25;

/**
 * The voter roll of a frozen election, on-roll or left-out, with a search box and a CSV export (fineract-dbug
 * #144). The whole list comes back from one call; paging and the download both work over what is already loaded.
 */
@Component({
  selector: 'mifosx-voter-roll',
  templateUrl: './voter-roll.component.html',
  styleUrls: ['./voter-roll.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    MatPaginatorModule,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VoterRollComponent implements OnInit {
  private electionsService = inject(ElectionsService);
  private bsCalendar = inject(BsCalendarService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  @Input({ required: true }) electionId!: number;
  @Input() votersIncluded: number | null = null;
  @Input() votersLeftOut: number | null = null;

  readonly included = signal(true);
  readonly search = new FormControl('');
  readonly voters = signal<Voter[]>([]);
  readonly loading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = PAGE_SIZE;

  get paged(): Voter[] {
    const start = this.pageIndex() * this.pageSize;
    return this.voters().slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  toggle(included: boolean): void {
    if (this.included() === included) {
      return;
    }
    this.included.set(included);
    this.load();
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
  }

  load(): void {
    this.loading.set(true);
    this.pageIndex.set(0);
    this.electionsService.voters(this.electionId, this.included(), this.search.value ?? undefined).subscribe({
      next: (v) => {
        this.voters.set(v);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private bs(iso: string): string {
    return this.bsCalendar.formatLong(this.bsCalendar.toBs(iso)) || iso;
  }

  reasonLabel(reason: string | null): string {
    return reason ? this.translate.instant(`elections.voterReason.${reason}`) : '';
  }

  /** UTF-8 with a BOM, so a program like Excel shows the Nepali names correctly. */
  download(): void {
    const header = [
      this.translate.instant('elections.AccountNumber'),
      this.translate.instant('labels.inputs.name'),
      this.translate.instant('labels.inputs.Office'),
      this.translate.instant('elections.JoinedOn'),
      this.translate.instant('elections.Shares'),
      ...(this.included() ? [] : [this.translate.instant('elections.Reason')])
    ];
    const rows = this.voters().map((v) => {
      const row = [
        v.accountNo,
        v.name,
        v.officeName ?? '',
        this.bs(v.joinedOn),
        String(v.shares)
      ];
      if (!this.included()) {
        row.push(this.reasonLabel(v.reason));
      }
      return row;
    });
    const csv = [
      header,
      ...rows
    ]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(
      [
        '﻿' + csv
      ],
      { type: 'text/csv;charset=utf-8' }
    );
    const which = this.included() ? 'on-roll' : 'left-out';
    saveBlob(blob, `election-${this.electionId}-voters-${which}.csv`);
  }
}
