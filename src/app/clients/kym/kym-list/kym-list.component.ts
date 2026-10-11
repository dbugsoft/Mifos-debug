/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { TranslateService } from '@ngx-translate/core';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { KymService } from '../kym.service';
import { KymListRow, KymListStatus } from '../kym.models';

const PAGE = 100;

/**
 * Members whose KYM needs work, by office (fineract-dbug #190): what each lacks, waiting for a second person's
 * check, due for review, and who the KYM gate would stop. A row opens the member's KYM tab.
 */
@Component({
  selector: 'mifosx-kym-list',
  templateUrl: './kym-list.component.html',
  styleUrls: ['./kym-list.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTabNav,
    MatTabLink,
    MatTabNavPanel
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KymListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private kymService = inject(KymService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly canRead = this.kymService.canRead();
  readonly statuses: KymListStatus[] = [
    'INCOMPLETE',
    'COMPLETE',
    'REVIEW_DUE',
    'BLOCKED'
  ];
  readonly status = signal<KymListStatus>('INCOMPLETE');
  readonly officeId = signal<number | null>(null);
  readonly offices = signal<{ id: number; name: string; nameDecorated: string }[]>([]);
  readonly rows = signal<KymListRow[]>([]);
  readonly loading = signal(true);
  /** A full page came back: there may be more */
  readonly more = signal(false);
  readonly search = signal('');
  readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.rows().filter((r) => r.name.toLowerCase().includes(q) || (r.accountNo ?? '').includes(q))
      : this.rows();
  });

  ngOnInit(): void {
    if (!this.canRead) {
      this.loading.set(false);
      return;
    }
    this.http
      .get<{ id: number; name: string; nameDecorated: string }[]>('/offices')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((o) => this.offices.set(o));
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const wanted = (params.get('status') ?? 'incomplete').toUpperCase().replace('-', '_') as KymListStatus;
      this.status.set(this.statuses.includes(wanted) ? wanted : 'INCOMPLETE');
      const office = params.get('office');
      this.officeId.set(office ? Number(office) : null);
      this.load(false);
    });
  }

  show(status: KymListStatus | null, officeId?: number | null): void {
    const s = status ?? this.status();
    const o = officeId === undefined ? this.officeId() : officeId;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: s.toLowerCase().replace('_', '-'), office: o ?? null },
      replaceUrl: true
    });
  }

  open(row: KymListRow): void {
    this.router.navigate([
      '/members',
      row.clientId,
      'kym'
    ]);
  }

  /** The missing items in words: the first few, then how many more. */
  missingText(row: KymListRow): string {
    if (!row.missingItems) {
      return '';
    }
    const items = row.missingItems.split(',');
    const words = items.slice(0, 3).map((item) => {
      const key = (row.organisation ? 'kym.org.missing.' : 'kym.missing.') + item;
      const t = this.translate.instant(key);
      return t && t !== key ? t : item;
    });
    const rest = items.length - words.length;
    return words.join(' · ') + (rest > 0 ? ' · ' + this.translate.instant('kym.list.andMore', { count: rest }) : '');
  }

  load(append: boolean): void {
    this.loading.set(true);
    const offset = append ? this.rows().length : 0;
    this.kymService
      .list(this.status(), this.officeId(), offset, PAGE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.rows.set(
            append ? [
                  ...this.rows(),
                  ...rows
                ] : rows
          );
          this.more.set(rows.length === PAGE);
          this.loading.set(false);
        },
        error: () => {
          if (!append) {
            this.rows.set([]);
          }
          this.more.set(false);
          this.loading.set(false);
        }
      });
  }
}
