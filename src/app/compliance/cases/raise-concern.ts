/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MatDialog } from '@angular/material/dialog';
import { Observable, map, of, switchMap } from 'rxjs';
import { InputDialogComponent, InputDialogData } from '../input-dialog/input-dialog.component';
import { CasesService } from './cases.service';

/**
 * "Raise a concern" from a member's page (fineract-dbug #133, policy §30(3)): any staff member tells the compliance
 * officer what they noticed, including an attempted transaction. The answer is only that it was sent, so nothing can
 * tip anyone off. Emits true once sent.
 */
export function raiseConcern(dialog: MatDialog, cases: CasesService, clientId: number): Observable<boolean> {
  return dialog
    .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
      data: {
        title: 'compliance.concern.title',
        message: 'compliance.concern.lead',
        fields: [
          {
            name: 'what',
            label: 'compliance.concern.What did you notice',
            type: 'textarea',
            required: true,
            maxLength: 2000
          },
          {
            name: 'attempted',
            label: 'compliance.concern.Was it',
            type: 'select',
            required: true,
            value: 'false',
            options: [
              { value: 'false', label: 'compliance.concern.Something about the member' },
              { value: 'true', label: 'compliance.concern.An attempted transaction' }
            ]
          },
          { name: 'amount', label: 'compliance.concern.Amount', maxLength: 20, hint: 'compliance.concern.amountHint' }
        ],
        confirm: 'compliance.concern.Send'
      },
      width: '560px',
      maxWidth: '96vw',
      autoFocus: false
    })
    .afterClosed()
    .pipe(
      switchMap((r) => {
        if (!r) {
          return of(false);
        }
        const amount = Number(String(r['amount'] ?? '').replace(/[,\s]/g, ''));
        return cases
          .raiseConcern({
            clientId,
            what: r['what'],
            attempted: r['attempted'] === 'true',
            amount: amount > 0 ? amount : undefined
          })
          .pipe(map(() => true));
      })
    );
}
