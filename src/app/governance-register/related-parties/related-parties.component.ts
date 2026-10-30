/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { InputDialogComponent, InputDialogData } from 'app/compliance/input-dialog/input-dialog.component';
import { RelatedPartiesService } from './related-parties.service';
import { LoanReport, NotLinked, PersonParties, RelatedPartiesRegister, Step } from './related-parties.models';
import { LinkDialogComponent, LinkDialogData } from './link-dialog/link-dialog.component';

/** Who's related to those who govern the cooperative, the report, and family not yet linked (fineract-dbug #139). */
@Component({
  selector: 'mifosx-related-parties',
  templateUrl: './related-parties.component.html',
  styleUrls: ['./related-parties.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatIcon,
    MatProgressBar,
    MatTabsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelatedPartiesComponent implements OnInit {
  private relatedParties = inject(RelatedPartiesService);
  private dialog = inject(MatDialog);

  readonly register = signal<RelatedPartiesRegister | null>(null);
  readonly report = signal<LoanReport | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly showReport = signal(false);
  readonly expandedWays = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.relatedParties.register().subscribe({
      next: (r) => {
        this.register.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  toggleReport(): void {
    this.showReport.set(!this.showReport());
    if (this.showReport() && !this.report()) {
      this.relatedParties.loans().subscribe((r) => this.report.set(r));
    }
  }

  link(n: NotLinked): void {
    this.dialog
      .open<LinkDialogComponent, LinkDialogData, PersonParties>(LinkDialogComponent, {
        data: { personId: n.personId, officerName: n.officerName, suggested: n },
        width: '520px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((linked) => linked && this.load());
  }

  wayKey(clientId: number, personId: number, kin: string): string {
    return `${clientId}-${personId}-${kin}`;
  }

  toggleWay(key: string): void {
    const open = new Set(this.expandedWays());
    open.has(key) ? open.delete(key) : open.add(key);
    this.expandedWays.set(open);
  }

  removeStep(step: Step): void {
    if (step.linkId === null) {
      return;
    }
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'relatedParties.RemoveLinkTitle',
          message: `${step.toName} · ${step.fromName}`,
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'relatedParties.RemoveLink',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r?.reason) {
          this.relatedParties.removeLink(step.linkId!, r.reason).subscribe(() => this.load());
        }
      });
  }
}
