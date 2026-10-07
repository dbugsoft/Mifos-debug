/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent
} from '@angular/material/dialog';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-import-loan-product-dialog',
  templateUrl: './import-loan-product-dialog.component.html',
  styleUrls: ['./import-loan-product-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatIcon,
    MatIconButton,
    MatTooltip,
    MatDialogActions,
    MatDialogClose
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportLoanProductDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<ImportLoanProductDialogComponent>>(MatDialogRef);
  private formBuilder = inject(UntypedFormBuilder);
  data = inject(MAT_DIALOG_DATA);

  /** Import Loan Product form. */
  importLoanProductForm: UntypedFormGroup;
  /** Whether a file is being dragged over the drop zone. */
  isDragging = false;

  get file(): File | null {
    return this.importLoanProductForm.get('file').value || null;
  }

  ngOnInit() {
    this.createImportLoanProductForm();
  }

  /**
   * Creates the import loan product form.
   */
  createImportLoanProductForm() {
    this.importLoanProductForm = this.formBuilder.group({
      file: [
        '',
        Validators.required
      ]
    });
  }

  /**
   * Sets file form control value.
   * @param {Event} $event file input change event.
   */
  onFileSelect($event: Event) {
    const input = $event.target as HTMLInputElement;
    this.setFile(input.files?.[0]);
    input.value = '';
  }

  onDragOver($event: DragEvent) {
    $event.preventDefault();
    this.isDragging = true;
  }

  onDrop($event: DragEvent) {
    $event.preventDefault();
    this.isDragging = false;
    this.setFile($event.dataTransfer?.files?.[0]);
  }

  clearFile() {
    this.importLoanProductForm.get('file').setValue('');
  }

  /** Only .json files are accepted; dropped files bypass the input's accept filter. */
  private setFile(file?: File) {
    if (file && file.name.toLowerCase().endsWith('.json')) {
      this.importLoanProductForm.get('file').setValue(file);
    }
  }
}
