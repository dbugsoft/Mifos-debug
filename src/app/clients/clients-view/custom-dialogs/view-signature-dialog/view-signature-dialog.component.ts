/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

/** Custom Services */
import { ClientsService } from 'app/clients/clients.service';

import { CdkScrollable } from '@angular/cdk/scrolling';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * View signature dialog component.
 */
@Component({
  selector: 'mifosx-view-signature-dialog',
  templateUrl: './view-signature-dialog.component.html',
  styleUrls: ['./view-signature-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatProgressSpinner
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewSignatureDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<ViewSignatureDialogComponent>>(MatDialogRef);
  private clientsService = inject(ClientsService);
  private destroyRef = inject(DestroyRef);
  data = inject<{
    documents: any[];
    id: string;
  }>(MAT_DIALOG_DATA);

  /** Id of client signature in documents */
  signatureId: any;
  /** Client Id */
  clientId: any;
  /**
   * blob: URL of the signature once loaded. Signals, because this dialog is OnPush: a plain field set in
   * the HTTP callback never re-rendered, so the <img> kept an empty src and showed as broken (fineract-dbug #332).
   */
  readonly signatureImage = signal<string | null>(null);
  /** True when the signature file could not be downloaded. */
  readonly loadFailed = signal(false);

  constructor() {
    const signature = this.data.documents.find((document: any) => document.name === 'clientSignature') || {};
    this.signatureId = signature.id;
    this.clientId = this.data.id;
  }

  ngOnInit() {
    if (!this.signatureId) {
      return;
    }
    this.clientsService.getClientSignatureImage(this.clientId, this.signatureId).subscribe({
      next: (blob: Blob) => {
        // A blob: URL passes Angular's URL sanitizer as it is; release it when the dialog closes.
        const url = URL.createObjectURL(blob);
        this.destroyRef.onDestroy(() => URL.revokeObjectURL(url));
        this.signatureImage.set(url);
      },
      error: () => this.loadFailed.set(true)
    });
  }
}
