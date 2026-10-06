/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { ClientActionNotifierService } from '../../clients-view/client-actions/client-action-notifier.service';
import { MembershipApplication } from '../membership.models';
import { MembershipDeadlineComponent } from '../membership-deadline/membership-deadline.component';
import {
  MembershipDecisionData,
  MembershipDecisionDialogComponent
} from '../membership-decision-dialog/membership-decision-dialog.component';

/**
 * A member's membership application (fineract-dbug ADR 0023): where it stands, what is being bought, the board's
 * decision, and the accounts the approval opened.
 */
@Component({
  selector: 'mifosx-membership-tab',
  templateUrl: './membership-tab.component.html',
  styleUrls: ['./membership-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    FaIconComponent,
    FormatNumberPipe,
    MembershipDeadlineComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipTabComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private notifier = inject(ClientActionNotifierService);
  private destroyRef = inject(DestroyRef);

  readonly application = signal<MembershipApplication | null>(null);
  readonly savingsAccount = signal<any>(null);
  readonly shareAccount = signal<any>(null);

  constructor() {
    this.route.parent.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: { membershipApplication: MembershipApplication | null }) =>
        this.application.set(data.membershipApplication ?? null)
      );
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data: { clientAccountsData: any }) => {
      const app = this.application();
      const accounts = data.clientAccountsData ?? {};
      this.savingsAccount.set(
        (accounts.savingsAccounts ?? []).find((a: any) => a.id === app?.savingsAccountId) ?? null
      );
      this.shareAccount.set((accounts.shareAccounts ?? []).find((a: any) => a.id === app?.shareAccountId) ?? null);
    });
  }

  decide(decision: 'approve' | 'reject'): void {
    const application = this.application();
    if (!application) {
      return;
    }
    this.dialog
      .open<MembershipDecisionDialogComponent, MembershipDecisionData>(MembershipDecisionDialogComponent, {
        data: { application, decision },
        width: '560px',
        maxWidth: 'calc(100vw - 32px)'
      })
      .afterClosed()
      .subscribe((decided?: MembershipApplication) => {
        if (!decided) {
          return;
        }
        this.notifier.notify(decision === 'approve' ? 'membership.messages.approved' : 'membership.messages.rejected');
        reloadMemberPage(this.router, decided.clientId);
      });
  }
}

/**
 * Shows the member page again with fresh data: status, header and accounts all change on a decision. The member page
 * resolves its data only when the member changes, so pass through the members list without changing the address.
 */
export function reloadMemberPage(router: Router, clientId: number): void {
  router.navigateByUrl('/members', { skipLocationChange: true }).then(() =>
    router.navigate([
      '/members',
      clientId,
      'membership'
    ])
  );
}
