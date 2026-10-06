/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { ClientActionNotifierService } from '../../clients-view/client-actions/client-action-notifier.service';
import { MembershipApplication, MembershipTemplate } from '../membership.models';
import { MembershipService } from '../membership.service';
import { MembershipDeadlineComponent } from '../membership-deadline/membership-deadline.component';
import {
  MembershipDecisionData,
  MembershipDecisionDialogComponent
} from '../membership-decision-dialog/membership-decision-dialog.component';
import {
  MembershipApplyData,
  MembershipApplyDialogComponent
} from '../membership-apply-dialog/membership-apply-dialog.component';

/**
 * A member's membership (fineract-dbug ADR 0023 and 0035): where the latest application stands, what is being bought,
 * the money taken, the decision and its reason or note, and the accounts the approval opened; then every earlier
 * application with its decision. A refused person can apply again from here.
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
  private membershipService = inject(MembershipService);
  private destroyRef = inject(DestroyRef);

  readonly application = signal<MembershipApplication | null>(null);
  /** Every application, newest first; the first is {@link application}. */
  readonly history = signal<MembershipApplication[]>([]);
  readonly earlier = computed(() => this.history().slice(1));
  readonly template = signal<MembershipTemplate | null>(null);
  readonly savingsAccount = signal<any>(null);
  readonly shareAccount = signal<any>(null);

  /** "A different person must approve" is on, and this user entered the application. */
  readonly mustBeSomeoneElse = computed(() => {
    const app = this.application();
    return !!app && !this.membershipService.mayDecide(app, this.template()?.settings);
  });
  readonly canApplyAgain = computed(
    () => this.application()?.status === 'REJECTED' && this.membershipService.can('CREATE_MEMBERSHIP')
  );

  constructor() {
    this.route.parent.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: { membershipApplication: MembershipApplication | null }) => {
        const app = data.membershipApplication ?? null;
        this.application.set(app);
        if (app) {
          this.membershipService.history(app.clientId).subscribe((all) => this.history.set(all));
        }
      });
    this.membershipService.templateOrNull().subscribe((template) => this.template.set(template));
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

  applyAgain(): void {
    const application = this.application();
    const template = this.template();
    if (application && template) {
      openApplyDialog(this.dialog, {
        template,
        clientId: application.clientId,
        name: application.name,
        mode: 'again',
        previous: application
      }).subscribe((taken) => {
        if (taken) {
          this.notifier.notify('membership.messages.applicationTaken');
          reloadMemberPage(this.router, taken.clientId);
        }
      });
    }
  }
}

/** Opens the dialog for applying again or entering an existing application; emits the application taken, if any. */
export function openApplyDialog(dialog: MatDialog, data: MembershipApplyData) {
  return dialog
    .open<MembershipApplyDialogComponent, MembershipApplyData, MembershipApplication>(MembershipApplyDialogComponent, {
      data,
      width: '760px',
      maxWidth: 'calc(100vw - 32px)'
    })
    .afterClosed();
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
