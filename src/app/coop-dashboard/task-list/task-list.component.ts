/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DualDateComponent } from 'app/shared/dual-date/dual-date.component';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ActionCode, ActionItem, ActionPage, Filters } from '../coop-dashboard.models';
import { CoopDashboardService } from '../coop-dashboard.service';
import { grouped, shortAmount } from '../coop-format';
import { InfoTipComponent } from '../widgets/info-tip.component';

const TASKS: ActionCode[] = [
  'LOANS_RECENTLY_OVERDUE',
  'LOANS_DUE_THIS_WEEK',
  'FIXED_DEPOSITS_MATURING',
  'DOCUMENTS_EXPIRING',
  'KYC_INCOMPLETE',
  'LOANS_AWAITING_APPROVAL',
  'LOANS_AWAITING_DISBURSAL',
  'MEMBERS_AWAITING_ACTIVATION',
  'CASH_WITH_CASHIERS'
];

/**
 * Every record of one "needs attention" task (fineract-dbug ADR 0021), a page at a time from the server: search, sort,
 * office, page size, and a CSV of the whole filtered list. The task, office, search and page live in the address, so a
 * view can be bookmarked or shared.
 */
@Component({
  selector: 'mifosx-coop-task-list',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    FaIconComponent,
    TranslatePipe,
    DualDateComponent,
    InfoTipComponent
  ],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskListComponent implements OnInit {
  private service = inject(CoopDashboardService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly tasks = TASKS;
  readonly columns = [
    'name',
    'detail',
    'account',
    'date',
    'amount',
    'open'
  ];
  readonly filters = signal<Filters | null>(null);
  readonly page = signal<ActionPage | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly downloading = signal(false);

  code: ActionCode = 'LOANS_RECENTLY_OVERDUE';
  officeId: number | null = null;
  offset = 0;
  limit = 25;
  sort: Sort = { active: '', direction: '' };
  readonly search = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.service.filters().subscribe({ next: (f) => this.filters.set(f) });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const code = params.get('code') as ActionCode;
      this.code = TASKS.includes(code) ? code : 'LOANS_RECENTLY_OVERDUE';
      const q = this.route.snapshot.queryParamMap;
      this.officeId = Number(q.get('officeId')) || null;
      this.offset = Number(q.get('offset')) || 0;
      this.limit = Number(q.get('limit')) || 25;
      this.search.setValue(q.get('search') ?? '', { emitEvent: false });
      this.sort = { active: q.get('sort') ?? '', direction: (q.get('direction') as 'asc' | 'desc') ?? '' };
      this.load();
    });
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.offset = 0;
        this.reflect();
      });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.service
      .actionPage(this.code, this.officeId, {
        offset: this.offset,
        limit: this.limit,
        search: this.search.value,
        sort: this.sort.direction ? this.sort.active : undefined,
        direction: this.sort.direction || undefined
      })
      .subscribe({
        next: (p) => {
          this.page.set(p);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        }
      });
  }

  onTask(code: ActionCode): void {
    // A different task starts afresh: a search for one list rarely makes sense in another.
    this.search.setValue('', { emitEvent: false });
    this.offset = 0;
    this.sort = { active: '', direction: '' };
    this.router.navigate(
      [
        '/dashboard',
        'tasks',
        code
      ],
      { queryParams: this.queryParams() }
    );
  }

  onOffice(id: number): void {
    this.officeId = id || null;
    this.offset = 0;
    this.reflect();
  }

  onPage(e: PageEvent): void {
    this.offset = e.pageIndex * e.pageSize;
    this.limit = e.pageSize;
    this.reflect();
  }

  onSort(s: Sort): void {
    this.sort = s;
    this.offset = 0;
    this.reflect();
  }

  /** Puts the view in the address (so it can be bookmarked) and reloads. */
  private reflect(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: this.queryParams(), replaceUrl: true });
    this.load();
  }

  private queryParams(): Record<string, string | number | null> {
    return {
      officeId: this.officeId,
      offset: this.offset || null,
      limit: this.limit === 25 ? null : this.limit,
      search: this.search.value || null,
      sort: this.sort.direction ? this.sort.active : null,
      direction: this.sort.direction || null
    };
  }

  link(item: ActionItem): any[] | null {
    if (item.entity === 'loan' && item.clientId) return [
        '/members',
        item.clientId,
        'loans-accounts',
        item.id,
        'general'
      ];
    if (item.entity === 'fixeddeposit' && item.clientId) return [
        '/members',
        item.clientId,
        'fixed-deposits-accounts',
        item.id
      ];
    if (this.code === 'DOCUMENTS_EXPIRING' && item.clientId) return [
        '/members',
        item.clientId,
        'identities'
      ];
    if (item.entity === 'client' && item.clientId) return [
        '/members',
        item.clientId,
        'general'
      ];
    if (item.entity === 'cashier') return [
        '/organization',
        'tellers'
      ];
    return null;
  }

  open(item: ActionItem): void {
    const link = this.link(item);
    if (link) this.router.navigate(link);
  }

  hasAmount(item: ActionItem): boolean {
    return item.amount !== null && item.amount !== undefined;
  }

  expired(item: ActionItem): boolean {
    return this.code === 'DOCUMENTS_EXPIRING' && !!item.date && item.date < new Date().toISOString().slice(0, 10);
  }

  /** The whole filtered list as a CSV file, fetched a page at a time. */
  download(): void {
    const total = this.page()?.total ?? 0;
    if (!total) return;
    this.downloading.set(true);
    const rows: ActionItem[] = [];
    const next = (offset: number): void => {
      this.service
        .actionPage(this.code, this.officeId, {
          offset,
          limit: 200,
          search: this.search.value,
          sort: this.sort.direction ? this.sort.active : undefined,
          direction: this.sort.direction || undefined
        })
        .subscribe({
          next: (p) => {
            rows.push(...p.items);
            if (rows.length < p.total && p.items.length) next(offset + 200);
            else this.save(rows);
          },
          error: () => this.downloading.set(false)
        });
    };
    next(0);
  }

  private save(rows: ActionItem[]): void {
    const t = (k: string) => this.translate.instant('coopDashboard.' + k);
    const header = [
      t(this.code === 'CASH_WITH_CASHIERS' ? 'Cashier' : 'Member'),
      t('Details'),
      t('Account'),
      t('dateHeader.' + this.code),
      t('Amount')
    ];
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      header,
      ...rows.map((r) => [
        r.clientName,
        r.detail,
        r.accountNo,
        r.date,
        r.amount
      ])
    ].map((r) => r.map(cell).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.code.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.downloading.set(false);
  }

  readonly short = shortAmount;
  readonly grouped = grouped;
}
