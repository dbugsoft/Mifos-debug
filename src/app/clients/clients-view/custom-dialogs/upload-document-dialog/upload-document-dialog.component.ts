/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnInit,
  Output,
  inject
} from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  FormBuilder,
  FormGroupDirective,
  NgForm,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { FileUploadComponent } from '../../../../shared/file-upload/file-upload.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { TranslateService } from '@ngx-translate/core';

/**
 * A `server` error (see applyServerError) is set programmatically from
 * outside any user interaction, so the control is never naturally
 * touched/dirty - Material's default ErrorStateMatcher (which gates the
 * red outline on touched/dirty) would otherwise leave the field
 * unstyled even though it's genuinely invalid. This shows the error
 * state immediately whenever a `server` error is present, on top of
 * the default behavior for every other error.
 */
class ServerErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const defaultErrorState = !!(control && control.invalid && (control.dirty || control.touched || form?.submitted));
    return defaultErrorState || !!control?.hasError('server');
  }
}

@Component({
  selector: 'mifosx-upload-document-dialog',
  templateUrl: './upload-document-dialog.component.html',
  styleUrls: ['./upload-document-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    FileUploadComponent,
    MatDialogActions,
    MatDialogClose
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadDocumentDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<UploadDocumentDialogComponent>>(MatDialogRef);
  private formBuilder = inject(FormBuilder);
  private translateService = inject(TranslateService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  data = inject(MAT_DIALOG_DATA);

  /** Upload Document form. */
  uploadDocumentForm: FormGroup;
  /** Shows a control as invalid immediately when it has a `server` error, regardless of touched state. */
  readonly serverErrorStateMatcher = new ServerErrorStateMatcher();
  /** Upload Document Data */
  uploadDocumentData: any = [];
  /** Triggers identity fields (documentType, status, documentKey) */
  documentIdentifier = false;
  /** Entity Type */
  entityType: string;
  /** Allowed Document Types for identifiers */
  allowedDocumentTypes: any[] = [];
  /** Status options for identifiers */
  statusOptions: any[] = [];
  /** Existing identity being edited, if any - null means "add" mode */
  identity: any = null;

  /**
   * Emitted when the user clicks Submit/Add/Upload with a valid form -
   * the dialog stays open until the caller either closes it (success)
   * or calls `applyServerError()` (failure), since a closed dialog
   * can't show a field-level or general server error.
   */
  @Output()
  submitted = new EventEmitter<any>();

  /** General (non-field-specific) server error banner text. */
  serverError: string | null = null;

  /**
   * @param {MatDialogRef} dialogRef Dialog reference element
   * @param {FormBuilder} formBuilder Form Builder
   * @param {any} data Dialog Data
   */
  constructor() {
    const data = this.data;

    this.documentIdentifier = data.documentIdentifier;
    this.entityType = data.entityType;
    this.allowedDocumentTypes = data.allowedDocumentTypes || [];
    this.statusOptions = data.statusOptions || [];
    this.identity = data.identity || null;
  }

  ngOnInit() {
    this.createUploadDocumentForm();
  }

  /**
   * Creates the upload Document form.
   */
  createUploadDocumentForm() {
    if (this.documentIdentifier) {
      // Unified form for identity: identifier fields + document upload.
      // When editing an existing identity, fields are pre-filled from
      // it and a new file is optional (document upload is unchanged
      // for now, so editing must not require re-selecting a file).
      const identity = this.identity;
      this.uploadDocumentForm = this.formBuilder.group({
        documentTypeId: [
          identity ? identity.documentType?.id : '',
          Validators.required
        ],
        status: [
          identity ? (identity.status === 'clientIdentifierStatusType.active' ? 'Active' : 'Inactive') : 'Active',
          Validators.required
        ],
        documentKey: [
          identity ? identity.documentKey : '',
          Validators.required
        ],
        description: [identity ? identity.description : ''],
        fileName: [
          identity ? identity.documents?.[0]?.name || identity.documents?.[0]?.fileName || '' : '',
          identity ? [] : Validators.required
        ],
        file: ['']
      });
    } else {
      // Standard document upload form
      this.uploadDocumentForm = this.formBuilder.group({
        fileName: [
          '',
          Validators.required
        ],
        description: [''],
        file: ['']
      });
    }
  }

  /**
   * Sets file form control value and auto-fills fileName.
   * @param {any} $event file change event.
   */
  onFileSelect($event: any) {
    if ($event.target.files.length > 0) {
      const file = $event.target.files[0];
      this.uploadDocumentForm.get('file').setValue(file);
      if (!this.uploadDocumentForm.get('fileName').value) {
        this.uploadDocumentForm.get('fileName').setValue(file.name);
      }
    }
  }

  /**
   * Fields the API can report a `parameterName` error against - only
   * these get an inline field error; anything else falls back to the
   * general banner (`serverError`).
   */
  private readonly serverErrorFields = [
    'documentTypeId',
    'documentKey',
    'status',
    'description'
  ];

  /**
   * Submit handler for both forms this dialog renders. For the
   * identifier form (documentIdentifier), this emits instead of
   * closing - the caller (identities-tab) makes the actual API call
   * and only closes the dialog on success, so a failure can be shown
   * right here without losing what the user typed. The plain document
   * upload form has no server-side error handling wired up yet, so it
   * keeps its previous behavior of closing immediately with the form
   * value.
   */
  onSubmitClick(): void {
    if (!this.documentIdentifier) {
      this.dialogRef.close(this.uploadDocumentForm.value);
      return;
    }

    this.serverError = null;
    this.serverErrorFields.forEach((name) => this.uploadDocumentForm.get(name)?.updateValueAndValidity());

    this.submitted.emit(this.uploadDocumentForm.value);
  }

  /**
   * Called by the caller when the API rejects the submitted data.
   * Attaches the error to the specific control when the API names one
   * (`errors[0].parameterName`), otherwise shows it as a general
   * banner - covers things like "No parameters passed for update",
   * which isn't about any one field.
   *
   * `messageOverride` lets the caller replace the backend's own
   * message - needed for errors like identityKey.duplicate, whose
   * `defaultUserMessage` names another client's own name/branch/document
   * key, which must never be shown to the person creating this one.
   */
  applyServerError(err: any, messageOverride?: string): void {
    const apiError = err?.error?.errors?.[0];
    const message: string =
      messageOverride ??
      apiError?.defaultUserMessage ??
      err?.error?.defaultUserMessage ??
      'Something went wrong. Please try again.';

    const control = apiError?.parameterName ? this.uploadDocumentForm.get(apiError.parameterName) : null;

    if (control) {
      control.setErrors({ server: message });
      // Angular Material only shows the red invalid state (outline +
      // underline) once a control is both invalid AND touched. This is
      // set programmatically, outside any blur/interaction, so without
      // this the field stays invalid but visually unstyled - only the
      // mat-error text below it would show.
      control.markAsTouched();
    } else {
      this.serverError = message;
    }

    // This dialog is OnPush and this method is called from outside it
    // (the caller's async HTTP error callback, not a template-bound
    // event on this component) - without this, the error is set
    // correctly in memory but the dialog never repaints to show it.
    this.changeDetectorRef.markForCheck();
  }
}
