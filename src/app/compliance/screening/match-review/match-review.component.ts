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
import { ComplianceService } from '../../compliance.service';
import { InputDialogComponent, InputDialogData } from '../../input-dialog/input-dialog.component';
import { Hit, ScreeningService } from '../screening.service';

/**
 * One possible sanctions match side by side (fineract-dbug #203, mockup "sanctions match review"): our record, the
 * list entry, how each detail compared and the score. The officer records "not a match" with the reason, or confirms,
 * which holds the member's funds at once; the page says plainly what confirming does.
 */
@Component({
  selector: 'mifosx-match-review',
  templateUrl: './match-review.component.html',
  styleUrls: ['./match-review.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchReviewComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private screening = inject(ScreeningService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly allowed = signal<boolean | null>(null);
  readonly hit = signal<Hit | null>(null);
  readonly busy = signal(false);
  readonly reason = signal('');
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
            this.reason.set('');
            this.screening.hit(Number(p.get('id'))).subscribe((h) => this.hit.set(h));
          }
        });
      });
  }

  /** Lines of a stored list field (aliases and documents are kept one per line). */
  lines(text: string | null | undefined): string[] {
    return (text ?? '')
      .split(/\n|,(?=\d{4})/)
      .map((s) => s.trim())
      .filter((s) => s);
  }

  notAMatch(): void {
    const text = this.reason().trim();
    if (text) {
      this.run('NOT_A_MATCH', text);
    }
  }

  confirm(): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data: {
          title: 'compliance.screening.Confirm match and hold funds',
          message: 'compliance.screening.confirmLead',
          fields: [
            {
              name: 'reason',
              label: 'compliance.screening.What shows it is the same person',
              type: 'textarea',
              required: true,
              maxLength: 1000
            }
          ],
          confirm: 'compliance.screening.Confirm and hold funds',
          danger: true
        },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((r) => r && this.run('CONFIRMED', r['reason']));
  }

  private run(decision: 'NOT_A_MATCH' | 'CONFIRMED', reason: string): void {
    this.busy.set(true);
    this.screening.decide(this.hit()!.id, decision, reason).subscribe({
      next: (h) => {
        this.hit.set(h);
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }
}
