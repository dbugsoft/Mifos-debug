/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { InputDialogComponent, InputDialogData } from '../input-dialog/input-dialog.component';
import { OfficerCover, OfficerLogin, OfficerService } from './officer.service';

/**
 * Under the officer on Our own duties (fineract-dbug ADR-0064): what their login cannot do yet, whether their family
 * can be checked, who else can decide cases and send reports, and who covers while they are away.
 */
@Component({
  selector: 'mifosx-officer-panel',
  templateUrl: './officer-panel.component.html',
  styleUrls: ['./officer-panel.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OfficerPanelComponent implements OnInit {
  readonly officer = inject(OfficerService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly canManage = input(false);
  /** The checks of the officer's login sit under the officer; the cover at the end of the section. */
  readonly part = input<'checks' | 'cover'>('cover');
  readonly busy = signal(false);

  ngOnInit(): void {
    // the page shows both parts; one asks
    if (this.part() === 'cover') {
      this.officer.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  readonly problems = loginProblems;

  active(covers: OfficerCover[]): OfficerCover[] {
    return covers.filter((c) => c.status !== 'OVER');
  }

  earlier(covers: OfficerCover[]): OfficerCover[] {
    return covers.filter((c) => c.status === 'OVER');
  }

  cover(): void {
    this.officer
      .logins()
      .pipe(
        switchMap((logins) => {
          const data: InputDialogData = {
            title: 'compliance.officer.Someone covers',
            message: 'compliance.officer.coverLead',
            fields: [
              { name: 'name', label: 'compliance.governance.Name', required: true, maxLength: 200 },
              {
                name: 'userId',
                label: 'compliance.officer.Their login',
                type: 'select',
                options: logins.map((l) => ({
                  value: String(l.id),
                  label: (l.name || l.username) + ' (' + l.username + ')'
                }))
              },
              { name: 'fromOn', label: 'compliance.officer.First day', type: 'date', required: true },
              { name: 'toOn', label: 'compliance.officer.Last day', type: 'date', required: true },
              { name: 'boardDecision', label: 'compliance.governance.Board decision', maxLength: 200 }
            ],
            confirm: 'compliance.governance.Record'
          };
          return this.dialog
            .open(InputDialogComponent, { data, width: '560px', maxWidth: '96vw', autoFocus: false })
            .afterClosed();
        }),
        filter((v): v is Record<string, string> => !!v),
        switchMap((v) => {
          this.busy.set(true);
          return this.officer.cover({
            name: v['name'],
            userId: v['userId'] ? Number(v['userId']) : null,
            fromOn: v['fromOn'],
            toOn: v['toOn'],
            boardDecision: v['boardDecision']
          });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({ next: () => this.busy.set(false), error: () => this.busy.set(false) });
  }

  endCover(c: OfficerCover): void {
    const data: InputDialogData = {
      title: 'compliance.officer.End the cover early',
      message: 'compliance.officer.endLead',
      fields: [
        { name: 'on', label: 'compliance.officer.Last day', type: 'date', required: true },
        { name: 'reason', label: 'compliance.officer.Why', type: 'textarea', required: true, maxLength: 500 }
      ],
      confirm: 'compliance.governance.Record'
    };
    this.dialog
      .open(InputDialogComponent, { data, width: '520px', maxWidth: '96vw', autoFocus: false })
      .afterClosed()
      .pipe(
        filter((v): v is Record<string, string> => !!v),
        switchMap((v) => {
          this.busy.set(true);
          return this.officer.endCover(c.id, v['on'], v['reason']);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({ next: () => this.busy.set(false), error: () => this.busy.set(false) });
  }
}

/** Something wrong with a login, in the order a clerk fixes it, as translation keys. */
export function loginProblems(p: OfficerLogin | undefined): string[] {
  if (!p) {
    return [];
  }
  if (!p.userId) {
    return ['compliance.officer.noLogin'];
  }
  const out: string[] = [];
  if (p.loginEnabled === false) {
    out.push('compliance.officer.loginOff');
  }
  if (p.missing?.length) {
    out.push('compliance.officer.loginLacks');
  }
  return out;
}
