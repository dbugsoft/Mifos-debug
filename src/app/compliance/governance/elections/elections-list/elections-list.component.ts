/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { ElectionsService } from '../elections.service';
import { Election, ElectionSummary } from '../elections.models';
import { electionStatusChipClass } from '../elections.status';
import { ElectionSetupDialogComponent } from './election-setup-dialog/election-setup-dialog.component';

/** The elections register: newest first (fineract-dbug #144). */
@Component({
  selector: 'mifosx-elections-list',
  templateUrl: './elections-list.component.html',
  styleUrls: ['./elections-list.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ElectionsListComponent implements OnInit {
  private electionsService = inject(ElectionsService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  readonly elections = signal<ElectionSummary[]>([]);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly statusChipClass = electionStatusChipClass;

  /** The counts behind the summary tiles at the top of the page. */
  readonly openCount = computed(() => this.elections().filter((e) => e.status === 'OPEN').length);
  readonly inProgressCount = computed(
    () => this.elections().filter((e) => e.status === 'ROLL_FROZEN' || e.status === 'LIST_PUBLISHED').length
  );
  readonly declaredCount = computed(() => this.elections().filter((e) => e.status === 'DECLARED').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.electionsService.elections().subscribe({
      next: (e) => {
        // Newest first (docs/governance-elections.md) - a stable sort by id, so it only reorders if the API ever
        // doesn't, and otherwise keeps the order it returned.
        this.elections.set([...e].sort((a, b) => b.id - a.id));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  open(e: ElectionSummary): void {
    this.router.navigate([
      '/compliance/governance/elections',
      e.id
    ]);
  }

  newElection(): void {
    this.dialog
      .open<ElectionSetupDialogComponent, void, Election>(ElectionSetupDialogComponent, {
        width: '640px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.router.navigate([
            '/compliance/governance/elections',
            created.id
          ]);
        }
      });
  }
}
