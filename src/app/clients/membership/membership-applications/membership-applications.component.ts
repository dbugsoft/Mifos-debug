/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { MembershipService } from '../membership.service';
import { MembershipApplication, MembershipStatus, MembershipTemplate } from '../membership.models';
import { MembershipDeadlineComponent } from '../membership-deadline/membership-deadline.component';

/**
 * Membership applications by status (fineract-dbug ADR 0023). Pending ones come oldest first, so those running out of
 * the board's time are on top.
 */
@Component({
  selector: 'mifosx-membership-applications',
  templateUrl: './membership-applications.component.html',
  styleUrls: ['./membership-applications.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatTabNav,
    MatTabLink,
    MatTabNavPanel,
    FaIconComponent,
    MatIcon,
    FormatNumberPipe,
    MembershipDeadlineComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipApplicationsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private membershipService = inject(MembershipService);
  private destroyRef = inject(DestroyRef);

  readonly statuses: MembershipStatus[] = [
    'PENDING',
    'APPROVED',
    'REJECTED'
  ];
  readonly status = signal<MembershipStatus>('PENDING');
  readonly template = signal<MembershipTemplate | null>(null);
  readonly applications = signal<MembershipApplication[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.applications().filter(
          (a) => a.name.toLowerCase().includes(q) || (a.mobileNo ?? '').includes(q) || a.accountNo.includes(q)
        )
      : this.applications();
  });

  ngOnInit(): void {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: { membershipTemplate: MembershipTemplate | null }) =>
        this.template.set(data.membershipTemplate)
      );
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const wanted = (params.get('status') ?? 'pending').toUpperCase() as MembershipStatus;
      this.status.set(this.statuses.includes(wanted) ? wanted : 'PENDING');
      this.load();
    });
  }

  show(status: MembershipStatus): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: status.toLowerCase() },
      replaceUrl: true
    });
  }

  open(application: MembershipApplication): void {
    this.router.navigate([
      '/members',
      application.clientId,
      'membership'
    ]);
  }

  private load(): void {
    this.loading.set(true);
    this.membershipService.list(this.status()).subscribe({
      next: (applications) => {
        this.applications.set(applications);
        this.loading.set(false);
      },
      error: () => {
        this.applications.set([]);
        this.loading.set(false);
      }
    });
  }
}
