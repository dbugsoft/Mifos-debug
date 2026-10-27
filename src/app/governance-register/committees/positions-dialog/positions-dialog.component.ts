/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { GovernanceRegisterService } from '../../governance-register.service';
import { Position } from '../../governance-register.models';
import { PositionDialogComponent, PositionDialogData } from '../position-dialog/position-dialog.component';

/** The positions a person can hold on a committee: lists them, and opens the add/edit dialog (docs/governance-register.md). */
@Component({
  selector: 'mifosx-positions-dialog',
  templateUrl: './positions-dialog.component.html',
  styleUrls: ['./positions-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    MatProgressBar,
    MatTooltip
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PositionsDialogComponent implements OnInit {
  private governance = inject(GovernanceRegisterService);
  private dialog = inject(MatDialog);

  readonly positions = signal<Position[]>([]);
  readonly loading = signal(false);
  readonly includeInactive = signal(true);

  ngOnInit(): void {
    this.load();
  }

  toggleInactive(e: MatCheckboxChange): void {
    this.includeInactive.set(e.checked);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.governance.positions(this.includeInactive()).subscribe({
      next: (p) => {
        this.positions.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  positionLabel(p: Position): string {
    return p.code.startsWith('OWN_') ? p.name : `governanceRegister.position.${p.code}`;
  }

  add(): void {
    this.dialog
      .open<PositionDialogComponent, PositionDialogData, Position>(PositionDialogComponent, {
        data: {},
        width: '480px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((created) => created && this.load());
  }

  edit(p: Position): void {
    this.dialog
      .open<PositionDialogComponent, PositionDialogData, Position>(PositionDialogComponent, {
        data: { position: p },
        width: '480px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((saved) => saved && this.load());
  }
}
