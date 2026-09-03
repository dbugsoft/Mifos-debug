/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoopAdminNavbarComponent } from '../coop-admin-navbar/coop-admin-navbar.component';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

import { debounceTime, distinctUntilChanged } from 'rxjs';
import { QueryClient, injectQuery } from '@tanstack/angular-query-experimental';

import { CoopAdminRegistration, CoopAdminService, CoopAdminStatus } from '../../services/coop-admin.service';
import { CoopAuthService } from '../../services/coop-auth.service';
import { CoopTokenService } from '../../services/coop-token.service';
import { adminListQueryOptions, adminStatsQueryOptions } from '../../queries/coop-admin.queries';
import { extractCoopErrorMessage } from '../../queries/coop-error.util';
import { clearCoopUserQueries } from '../../queries/coop-cache.util';

@Component({
  selector: 'mifosx-coop-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule,
    CoopAdminNavbarComponent
  ],
  templateUrl: './coop-admin-dashboard.component.html',
  styleUrl: './coop-admin-dashboard.component.scss'
})
export class CoopAdminDashboardComponent {
  private fb = inject(FormBuilder);
  private coopAdminService = inject(CoopAdminService);
  private coopAuthService = inject(CoopAuthService);
  private coopTokenService = inject(CoopTokenService);
  private queryClient = inject(QueryClient);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // =====================================================
  // LIST / SEARCH / PAGINATION
  // =====================================================

  readonly statusOptions: Array<{ value: CoopAdminStatus | ''; label: string }> = [
    { value: '', label: 'All statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PROVISIONED', label: 'Provisioned' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'REJECTED', label: 'Rejected' }
  ];

  readonly displayedColumns = [
    'nameEn',
    'coopRegdNo',
    'cooperativeCode',
    'mobilePhone',
    'status',
    'actions'
  ];

  filterForm = this.fb.nonNullable.group({
    status: '' as CoopAdminStatus | '',
    q: ''
  });

  readonly pageSizeOptions = [
    10,
    20,
    50
  ];

  pageSize = signal(20);
  currentPage = signal(1);

  private statusFilter = signal<CoopAdminStatus | ''>('');
  private searchTerm = signal('');

  /*
   * The list endpoint can be noticeably slow, so the
   * template shows an explicit "please wait" message
   * (not just a bare spinner) whenever listLoading is
   * true, per the observed backend response times.
   */

  // =====================================================
  // SERVER STATE (TanStack Query)
  // =====================================================

  private queryParams = computed(() => ({
    status: this.statusFilter() || undefined,
    q: this.searchTerm() || undefined,
    limit: this.pageSize(),
    offset: (this.currentPage() - 1) * this.pageSize()
  }));

  private statsQuery = injectQuery(() => adminStatsQueryOptions(this.coopAdminService));

  private cooperativesQuery = injectQuery(() => adminListQueryOptions(this.coopAdminService, this.queryParams()));

  get stats() {
    return this.statsQuery.data() ?? null;
  }

  get statsLoading(): boolean {
    return this.statsQuery.isPending();
  }

  get statsError(): string {
    if (!this.statsQuery.isError()) {
      return '';
    }

    return extractCoopErrorMessage(this.statsQuery.error(), 'Unable to load cooperative statistics.');
  }

  get cooperatives(): CoopAdminRegistration[] {
    return this.cooperativesQuery.data() ?? [];
  }

  get listLoading(): boolean {
    return this.cooperativesQuery.isFetching();
  }

  get listError(): string {
    if (!this.cooperativesQuery.isError()) {
      return '';
    }

    return extractCoopErrorMessage(this.cooperativesQuery.error(), 'Unable to load cooperatives. Please try again.');
  }

  get hasMore(): boolean {
    return this.cooperatives.length === this.pageSize();
  }

  get isFirstPage(): boolean {
    return this.currentPage() === 1;
  }

  // =====================================================
  // INIT
  // =====================================================

  constructor() {
    /*
     * Only the free-text search is debounced - status and
     * pagination changes call statusFilter.set()/currentPage.set()
     * directly and take effect immediately. A 3s debounce means
     * no Admin List request fires per keystroke; the searchTerm
     * signal (and therefore the TanStack Query key/queryFn) only
     * updates once the user has stopped typing for 3000ms.
     * distinctUntilChanged() additionally skips re-triggering the
     * query when debounce settles on the same value it already
     * had (e.g. typing then deleting back to the original text).
     */
    this.filterForm.controls.q.valueChanges
      .pipe(debounceTime(3000), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        this.searchTerm.set(q);
        this.currentPage.set(1);
      });
  }

  // =====================================================
  // LIST
  // =====================================================

  onStatusFilterChange(): void {
    this.statusFilter.set(this.filterForm.controls.status.value);
    this.currentPage.set(1);
  }

  goToFirstPage(): void {
    this.currentPage.set(1);
  }

  goToPreviousPage(): void {
    if (this.isFirstPage || this.listLoading) {
      return;
    }

    this.currentPage.update((page) => page - 1);
  }

  goToNextPage(): void {
    if (!this.hasMore || this.listLoading) {
      return;
    }

    this.currentPage.update((page) => page + 1);
  }

  changePageSize(): void {
    this.currentPage.set(1);
  }

  viewDetails(cooperative: CoopAdminRegistration): void {
    this.router.navigate([
      '/coop/admin',
      cooperative.id
    ]);
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    const refreshToken = this.coopTokenService.getRefreshToken();

    if (!refreshToken) {
      this.clearCoopSession();
      this.router.navigate(['/coop/login']);
      return;
    }

    this.coopAuthService.logout({ refreshToken }).subscribe({
      next: () => {
        this.clearCoopSession();
        this.router.navigate(['/coop/login']);
      },
      error: () => {
        this.clearCoopSession();
        this.router.navigate(['/coop/login']);
      }
    });
  }

  /**
   * Clears tokens plus every user-specific cached query, so
   * a different account logging in afterwards never sees
   * this user's cached profile/admin data.
   */
  private clearCoopSession(): void {
    this.coopTokenService.clearSession();
    clearCoopUserQueries(this.queryClient);
  }
}
