/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ConfirmationDialogComponent } from 'app/shared/confirmation-dialog/confirmation-dialog.component';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { MembershipService } from '../membership.service';
import { MembersWithoutShares, MembershipTemplate } from '../membership.models';

/**
 * Membership settings (fineract-dbug ADR 0023): the share-first rule, the board's decision period, the member savings
 * and share products, and the active members who hold no shares, to clear before the rule is switched on.
 */
@Component({
  selector: 'mifosx-membership-settings',
  templateUrl: './membership-settings.component.html',
  styleUrls: ['./membership-settings.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipSettingsComponent implements OnInit {
  private membershipService = inject(MembershipService);
  private authenticationService = inject(AuthenticationService);
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  readonly template = signal<MembershipTemplate | null>(null);
  readonly withoutShares = signal<MembersWithoutShares | null>(null);
  readonly saving = signal(false);
  readonly canUpdate = [
    'ALL_FUNCTIONS',
    'UPDATE_MEMBERSHIPSETTINGS'
  ].some((p) => (this.authenticationService.getCredentials()?.permissions ?? []).includes(p));

  readonly form = this.formBuilder.group({
    shareFirstEnabled: [false],
    decisionDays: [
      35,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(365)
      ]
    ],
    savingsProductId: [null as number | null],
    shareProductId: [null as number | null]
  });

  ngOnInit(): void {
    this.load();
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      return;
    }
    const turningOn = !!this.form.value.shareFirstEnabled && !this.template()?.settings.shareFirstEnabled;
    const count = this.withoutShares()?.count ?? 0;
    if (turningOn && count > 0) {
      this.dialog
        .open(ConfirmationDialogComponent, {
          data: {
            heading: this.translate.instant('membership.Switch the rule on'),
            dialogContext: this.translate.instant('membership.switchOnWarning', { count }),
            type: 'Mild'
          }
        })
        .afterClosed()
        .subscribe((response: any) => {
          if (response?.confirm) {
            this.store();
          }
        });
    } else {
      this.store();
    }
  }

  private store(): void {
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.membershipService
      .updateSettings({
        shareFirstEnabled: !!v.shareFirstEnabled,
        decisionDays: Number(v.decisionDays),
        savingsProductId: v.savingsProductId ?? undefined,
        shareProductId: v.shareProductId ?? undefined
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('membership.messages.settingsSaved'),
            this.translate.instant('labels.buttons.Close'),
            { duration: 3000 }
          );
          this.saving.set(false);
          this.load();
        },
        error: () => this.saving.set(false)
      });
  }

  private load(): void {
    forkJoin([
      this.membershipService.template(),
      this.membershipService.membersWithoutShares()
    ]).subscribe(
      ([
        template,
        withoutShares
      ]) => {
        this.template.set(template);
        this.withoutShares.set(withoutShares);
        this.form.reset({
          shareFirstEnabled: template.settings.shareFirstEnabled,
          decisionDays: template.settings.decisionDays,
          savingsProductId: template.settings.savingsProductId ?? null,
          shareProductId: template.settings.shareProductId ?? null
        });
        if (this.canUpdate) {
          this.form.enable();
        } else {
          this.form.disable();
        }
      }
    );
  }
}
