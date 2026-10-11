/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, catchError, map, of, shareReplay, switchMap } from 'rxjs';
import { SourceOfFundsDialogComponent } from './source-of-funds-dialog.component';

export interface SourceOfFundsTemplate {
  line: number;
  dayTotal: boolean;
  sources: { id: number; name: string }[];
}

/**
 * The counter's side of the source-of-funds rule (fineract-dbug #132, #137, ADR 0038). Before a deposit, loan repayment
 * or share purchase, the posting screen asks {@link ensureDeclared}: below the line it answers true at once; at the line
 * or above it opens the dialog and answers true once the declaration is saved, false when the teller goes back. The
 * backend refuses a qualifying posting without a declaration whatever the screen does; this only spares the teller the
 * refusal.
 */
@Injectable({ providedIn: 'root' })
export class SourceOfFundsService {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private template$?: Observable<SourceOfFundsTemplate | null>;

  template(): Observable<SourceOfFundsTemplate | null> {
    if (!this.template$) {
      this.template$ = this.http.get<SourceOfFundsTemplate>('/nepal/aml/source-of-funds/template').pipe(
        catchError(() => of(null)),
        shareReplay(1)
      );
    }
    return this.template$;
  }

  /** Pure: whether an amount needs a declaration (the line or more). */
  static needsDeclaration(amount: number, template: SourceOfFundsTemplate | null): boolean {
    return !!template && Number(amount) >= Number(template.line);
  }

  ensureDeclared(
    product: 'SAVINGS' | 'LOAN' | 'SHARE',
    target: { accountId?: number | string | null; clientId?: number | string | null },
    amount: number
  ): Observable<boolean> {
    return this.template().pipe(
      switchMap((template) => {
        if (!SourceOfFundsService.needsDeclaration(amount, template)) {
          return of(true);
        }
        return this.dialog
          .open(SourceOfFundsDialogComponent, {
            width: '560px',
            maxWidth: '95vw',
            data: {
              product,
              accountId: target.accountId != null ? Number(target.accountId) : null,
              clientId: target.clientId != null ? Number(target.clientId) : null,
              amount: Number(amount),
              line: template!.line,
              sources: template!.sources
            }
          })
          .afterClosed()
          .pipe(map((saved) => saved === true));
      })
    );
  }
}
