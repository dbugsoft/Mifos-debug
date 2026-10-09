/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { ComplianceService } from '../../compliance.service';
import { InputDialogComponent, InputDialogData } from '../../input-dialog/input-dialog.component';
import { Freeze, ScreeningService } from '../screening.service';

/**
 * One freeze (fineract-dbug #202, #203): the member's accounts as they are now, which ones the freeze blocked, the
 * match and the case behind it, and the release, which a second person makes with the reason.
 */
@Component({
  selector: 'mifosx-freeze-detail',
  templateUrl: './freeze-detail.component.html',
  styleUrls: ['../match-review/match-review.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatProgressBar,
    AdToBsPipe,
    FormatNumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreezeDetailComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private screening = inject(ScreeningService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly allowed = signal<boolean | null>(null);
  readonly freeze = signal<Freeze | null>(null);
  readonly busy = signal(false);
  canManage = false;

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.canManage = this.compliance.can('MANAGE_AMLSCREENING');
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          if (this.allowed()) {
            this.screening.freeze(Number(p.get('id'))).subscribe((f) => this.freeze.set(f));
          }
        });
      });
  }

  heldByThis(accountId: number): boolean {
    return (this.freeze()?.blockedByThisFreeze ?? []).includes(accountId);
  }

  release(): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data: {
          title: 'compliance.screening.Release the funds',
          message: 'compliance.screening.releaseLead',
          fields: [
            { name: 'reason', label: 'compliance.screening.Why', type: 'textarea', required: true, maxLength: 1000 }
          ],
          confirm: 'compliance.screening.Release'
        },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          this.busy.set(true);
          this.screening.release(this.freeze()!.id, r['reason']).subscribe({
            next: (f) => {
              this.freeze.set(f);
              this.busy.set(false);
            },
            error: () => this.busy.set(false)
          });
        }
      });
  }
}
