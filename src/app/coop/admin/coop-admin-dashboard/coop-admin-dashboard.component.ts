/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, DestroyRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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

import {
  CoopAdminRegistration,
  CoopAdminService,
  CoopAdminStats,
  CoopAdminStatus
} from '../../services/coop-admin.service';
import { CoopAuthService } from '../../services/coop-auth.service';
import { CoopTokenService } from '../../services/coop-token.service';

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
export class CoopAdminDashboardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private coopAdminService = inject(CoopAdminService);
  private coopAuthService = inject(CoopAuthService);
  private coopTokenService = inject(CoopTokenService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  // =====================================================
  // STATS
  // =====================================================

  stats: CoopAdminStats | null = null;
  statsLoading = true;
  statsError = '';

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

  cooperatives: CoopAdminRegistration[] = [];

  readonly pageSizeOptions = [
    10,
    20,
    50
  ];

  pageSize = 20;
  currentPage = 1;

  hasMore = false;
  isFirstPage = true;

  listLoading = false;
  listError = '';

  /*
   * The list endpoint can be noticeably slow, so the
   * template shows an explicit "please wait" message
   * (not just a bare spinner) whenever listLoading is
   * true, per the observed backend response times.
   */

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    console.log('========== ADMIN DASHBOARD INIT ==========');

    // Empty string = ALL statuses
    this.filterForm.controls.status.setValue('', {
      emitEvent: false
    });

    console.log('1. Filter initialized');

    console.log('2. Calling loadStats()');
    this.loadStats();

    console.log('3. Calling loadCooperatives()');
    this.loadCooperatives(true);

    this.filterForm.controls.q.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        console.log('SEARCH CHANGED');

        this.loadCooperatives(true);
      });
  }
  // =====================================================
  // STATS
  // =====================================================
  private loadStats(): void {
    this.statsLoading = true;
    this.statsError = '';

    this.coopAdminService.getStats().subscribe({
      next: (stats) => {
        this.stats = {
          PENDING: stats?.PENDING ?? 0,
          PROVISIONED: stats?.PROVISIONED ?? 0,
          ACTIVE: stats?.ACTIVE ?? 0,
          REJECTED: stats?.REJECTED ?? 0
        };

        this.statsLoading = false;
      },

      error: (error) => {
        this.statsLoading = false;

        this.statsError = error?.error?.error || error?.error?.message || 'Unable to load cooperative statistics.';
      }
    });
  }

  // =====================================================
  // LIST
  // =====================================================

  onStatusFilterChange(): void {
    this.loadCooperatives(true);
  }

  /**
   * @param reset true for a fresh search/filter (starts
   * back at offset 0 and replaces the list); false to
   * append the next page onto the existing list.
   */
  loadCooperatives(reset: boolean = false): void {
    console.log('========== loadCooperatives() ENTERED ==========');
    console.log('reset:', reset);

    if (reset) {
      this.currentPage = 1;
      this.cooperatives = [];
    }

    this.listLoading = true;
    this.listError = '';

    const { status, q } = this.filterForm.getRawValue();

    console.log('Current page:', this.currentPage);
    console.log('STATUS:', status);
    console.log('SEARCH:', q);

    const apiParams = {
      status: status || undefined,
      q: q || undefined,
      limit: this.pageSize,
      offset: (this.currentPage - 1) * this.pageSize
    };

    console.log('API PARAMS:', apiParams);
    console.log('========== CALLING getCooperatives() ==========');

    this.coopAdminService.getCooperatives(apiParams).subscribe({
      next: (results) => {
        console.log('========== API SUCCESS ==========');
        console.log('COOPERATIVE RESULTS:', results);
        console.log('RESULT COUNT:', results?.length);

        // IMPORTANT
        this.cooperatives = [...(results || [])];

        this.hasMore = this.cooperatives.length === this.pageSize;

        this.isFirstPage = this.currentPage === 1;

        this.listLoading = false;

        console.log('COOPERATIVES AFTER ASSIGN:', this.cooperatives);

        console.log('LIST LOADING:', this.listLoading);

        // Force Angular UI update
        this.cdr.detectChanges();

        console.log('========== CHANGE DETECTION DONE ==========');
      },

      error: (error) => {
        console.error('========== API ERROR ==========');

        console.error(error);

        this.listLoading = false;

        this.listError =
          error?.error?.error || error?.error?.message || 'Unable to load cooperatives. Please try again.';

        this.cdr.detectChanges();
      }
    });
  }

  goToPreviousPage(): void {
    if (this.currentPage <= 1 || this.listLoading) {
      return;
    }

    this.currentPage--;

    this.loadCooperatives();
  }

  goToNextPage(): void {
    if (!this.hasMore || this.listLoading) {
      return;
    }

    this.currentPage++;

    this.loadCooperatives();
  }

  changePageSize(): void {
    this.currentPage = 1;

    this.loadCooperatives();
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
      this.coopTokenService.clearSession();
      this.router.navigate(['/coop/login']);
      return;
    }

    this.coopAuthService.logout({ refreshToken }).subscribe({
      next: () => {
        this.coopTokenService.clearSession();
        this.router.navigate(['/coop/login']);
      },
      error: () => {
        this.coopTokenService.clearSession();
        this.router.navigate(['/coop/login']);
      }
    });
  }
}
