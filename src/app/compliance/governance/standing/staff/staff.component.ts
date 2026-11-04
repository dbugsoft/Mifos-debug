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
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { InputDialogComponent, InputDialogData } from 'app/compliance/input-dialog/input-dialog.component';
import { StandingService } from '../standing.service';
import { Employee } from '../standing.models';
import { LinkStaffDialogComponent, LinkStaffDialogData } from './link-staff-dialog/link-staff-dialog.component';

/**
 * Links staff to the members they also are, so the election's employee check can see them (fineract-dbug #144).
 * Active staff with no link are highlighted - the check can't tell they're staff otherwise.
 */
@Component({
  selector: 'mifosx-staff',
  templateUrl: './staff.component.html',
  styleUrls: ['./staff.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffComponent implements OnInit {
  private standing = inject(StandingService);
  private dialog = inject(MatDialog);

  readonly employees = signal<Employee[]>([]);
  readonly loading = signal(false);

  /** The counts behind the summary tiles and the unlinked-staff notice. */
  readonly activeCount = computed(() => this.employees().filter((e) => e.active).length);
  readonly linkedCount = computed(() => this.employees().filter((e) => !!e.clientId).length);
  readonly unlinkedCount = computed(() => this.employees().filter((e) => e.active && !e.clientId).length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.standing.employees().subscribe({
      next: (e) => {
        // Active staff first (fineract-dbug #144 screen 6) - a stable sort, so it only reorders by active/inactive
        // and otherwise keeps the order the API returned.
        this.employees.set([...e].sort((a, b) => Number(b.active) - Number(a.active)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  link(e: Employee): void {
    this.dialog
      .open<LinkStaffDialogComponent, LinkStaffDialogData, Employee>(LinkStaffDialogComponent, {
        data: { employee: e },
        width: '480px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.load());
  }

  /** A two-letter avatar badge from a "Last, First" staff name. */
  initials(name: string): string {
    const parts = name
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) {
      return '';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  removeLink(e: Employee): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, never>>(InputDialogComponent, {
        data: {
          title: 'elections.RemoveStaffLinkTitle',
          message: e.staffName,
          fields: [],
          confirm: 'elections.RemoveLink',
          danger: true
        },
        width: '460px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          this.standing.linkEmployee(e.staffId, null).subscribe(() => this.load());
        }
      });
  }
}
