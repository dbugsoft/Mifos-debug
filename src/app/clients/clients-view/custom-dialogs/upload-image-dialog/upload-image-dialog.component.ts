/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FileUploadComponent } from '../../../../shared/file-upload/file-upload.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ClientsService } from '../../../clients.service';

/**
 * Upload image dialog component.
 */
@Component({
  selector: 'mifosx-upload-image-dialog',
  templateUrl: './upload-image-dialog.component.html',
  styleUrls: ['./upload-image-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    FileUploadComponent,
    MatDialogActions,
    MatDialogClose
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadImageDialogComponent {
  dialogRef = inject<MatDialogRef<UploadImageDialogComponent>>(MatDialogRef);
  private translate = inject(TranslateService);

  /** Server-enforced limits; null while loading or if unavailable, in which case the server still refuses. */
  limits = toSignal(
    inject(ClientsService)
      .getUploadLimits()
      .pipe(catchError(() => of(null))),
    { initialValue: null }
  );

  /** Shown instead of uploading when the chosen file is over the limit. */
  sizeError = signal<string | null>(null);

  /** Client Image */
  image: File | null = null;

  /**
   * Sets file form control value, refusing a file over the server's limit before any request is sent.
   * @param {any} $event file change event.
   */
  onFileSelect($event: any) {
    const file: File = $event.target.files?.[0];
    if (!file) {
      return;
    }
    const limits = this.limits();
    if (limits && file.size > limits.imageMaxFileSizeBytes) {
      this.image = null;
      this.sizeError.set(
        this.translate.instant('error.msg.upload.file.too.big', { args: [{ value: limits.imageMaxFileSizeMb }] })
      );
      return;
    }
    this.sizeError.set(null);
    this.image = file;
  }
}
