/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CoopProfileService } from '../../../services/coop-profile.service';

import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';

import { Router } from '@angular/router';

import { CommonModule } from '@angular/common';

import { MatStepperModule } from '@angular/material/stepper';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { CoopNavbarComponent } from '../../../coop-navbar/coop-navbar.component';

import { CoopDocumentService, CoopDocumentType, CoopUploadedDocument } from '../../../services/coop-document.service';

@Component({
  selector: 'mifosx-coop-documents',

  standalone: true,

  imports: [
    CommonModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    CoopNavbarComponent
  ],

  templateUrl: './coop-documents.component.html',

  styleUrl: './coop-documents.component.scss'
})
export class CoopDocumentsComponent implements OnInit, OnDestroy {
  // =====================================================
  // SERVICES
  // =====================================================

  private readonly documentService = inject(CoopDocumentService);

  private readonly profileService = inject(CoopProfileService);

  private readonly router = inject(Router);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  // =====================================================
  // DOCUMENT TYPES
  // =====================================================

  documentTypes: CoopDocumentType[] = [];

  // =====================================================
  // SELECTED FILES
  // =====================================================

  selectedFiles: Record<string, File | null> = {};

  // =====================================================
  // IMAGE PREVIEWS
  // =====================================================

  previewUrls: Record<string, string> = {};

  // =====================================================
  // FILE ERRORS
  // =====================================================

  fileErrors: Record<string, string> = {};

  // =====================================================
  // UPLOADED DOCUMENTS
  // =====================================================

  uploadedDocuments: CoopUploadedDocument[] = [];

  // =====================================================
  // STATES
  // =====================================================

  isUploading = false;

  hasLoadError = false;

  // Profile status
  profileStatus = '';

  isReadOnly = false;

  profileStatusLoading = true;

  // =====================================================
  // DOCUMENT VIEWER
  // =====================================================

  isDocumentViewerOpen = false;

  selectedDocument: CoopUploadedDocument | null = null;

  selectedDocumentPreviewUrl: string | null = null;

  // =====================================================
  // DOCUMENT LOADING
  // =====================================================

  /**
   * Drives the loading skeleton.
   *
   * Starts true and turns false as soon as document
   * types arrive. Uploaded document previews load
   * independently in the background.
   */
  documentsLoading = true;

  // =====================================================
  // FILE SIZE
  // =====================================================

  readonly maxFileSize = 10 * 1024 * 1024; // 10 MB

  // =====================================================
  // NAVIGATION
  // =====================================================

  /**
   * Emitted when Back is clicked. The parent CoopStepperComponent
   * listens for this and calls stepper.previous(), returning to
   * the General Information step - this component has no direct
   * reference to the stepper itself, matching the existing
   * (nextStep) pattern already used by CoopProfileComponent.
   */
  @Output()
  readonly previousStep = new EventEmitter<void>();

  goBack(): void {
    this.previousStep.emit();
  }

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.loadProfileStatus();

    this.loadDocumentTypes();

    this.loadUploadedDocuments();
  }

  // =====================================================
  // DESTROY
  // =====================================================

  ngOnDestroy(): void {
    // Revoke all preview object URLs
    Object.values(this.previewUrls).forEach((url) => {
      URL.revokeObjectURL(url);
    });

    // Revoke temporary document viewer URL
    if (this.selectedDocumentPreviewUrl) {
      const existingPreview = this.selectedDocument ? this.previewUrls[this.selectedDocument.docType] : null;

      if (this.selectedDocumentPreviewUrl !== existingPreview) {
        URL.revokeObjectURL(this.selectedDocumentPreviewUrl);
      }
    }
  }

  // =====================================================
  // LOAD DOCUMENT TYPES
  // =====================================================

  private loadDocumentTypes(): void {
    console.log('[Documents] Loading document types...');

    this.documentService.getDocumentTypes().subscribe({
      next: (response) => {
        console.log('[Documents] Document types API response:', response);

        this.documentTypes = response ?? [];

        this.hasLoadError = false;

        this.documentsLoading = false;

        console.log('[Documents] Document types loaded:', this.documentTypes.length);

        this.changeDetectorRef.detectChanges();
      },

      error: (error) => {
        console.error('[Documents] Failed to load document types:', error);

        this.documentTypes = [];

        this.hasLoadError = true;

        this.documentsLoading = false;

        this.changeDetectorRef.detectChanges();
      }
    });
  }

  // =====================================================
  // LOAD UPLOADED DOCUMENTS
  // =====================================================

  private loadUploadedDocuments(): void {
    console.log('[Documents] Loading uploaded documents...');

    this.documentService.getUploadedDocuments().subscribe({
      next: (response) => {
        console.log('[Documents] Uploaded documents API response:', response);

        // GET /public/documents returns
        // a direct array of documents.
        this.uploadedDocuments = response ?? [];

        console.log('[Documents] Uploaded documents loaded:', this.uploadedDocuments.length);

        // =================================================
        // LOAD EXISTING DOCUMENT PREVIEWS
        // =================================================

        this.uploadedDocuments.forEach((document) => {
          this.loadUploadedDocumentPreview(document);
        });

        this.changeDetectorRef.detectChanges();
      },

      error: (error) => {
        console.error('[Documents] Failed to load uploaded documents:', error);

        this.uploadedDocuments = [];

        this.changeDetectorRef.detectChanges();
      }
    });
  }

  // =====================================================
  // LOAD PROFILE STATUS
  // =====================================================

  private loadProfileStatus(): void {
    console.log('[Documents] Loading cooperative profile status...');

    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.profileStatus = profile?.status?.toUpperCase() ?? 'PENDING';

        // =================================================
        // PENDING = EDITABLE
        // PROVISIONED = READ ONLY
        // ACTIVE = READ ONLY
        // =================================================

        this.isReadOnly = this.profileStatus === 'PROVISIONED' || this.profileStatus === 'ACTIVE';

        this.profileStatusLoading = false;

        console.log('[Documents] Profile status:', this.profileStatus);

        console.log('[Documents] Documents read only:', this.isReadOnly);

        this.changeDetectorRef.detectChanges();
      },

      error: (error) => {
        console.error('[Documents] Failed to load profile status:', error);

        /*
         * If profile status cannot be loaded,
         * keep the existing PENDING behavior.
         *
         * PENDING is editable.
         */

        this.profileStatus = 'PENDING';

        this.isReadOnly = false;

        this.profileStatusLoading = false;

        this.changeDetectorRef.detectChanges();
      }
    });
  }

  // =====================================================
  // LOAD EXISTING DOCUMENT PREVIEW
  // =====================================================

  private loadUploadedDocumentPreview(document: CoopUploadedDocument): void {
    const code = document.docType;

    console.log('[Documents] Loading existing document preview:', {
      documentType: code,
      fileName: document.fileName,
      viewUrl: document.viewUrl,
      contentType: document.contentType
    });

    // =====================================================
    // VIEW URL CHECK
    // =====================================================

    if (!document.viewUrl) {
      console.warn('[Documents] Uploaded document has no viewUrl, skipping preview:', {
        documentType: code,
        fileName: document.fileName
      });

      return;
    }

    // =====================================================
    // LOAD FILE
    // =====================================================

    this.documentService.getDocumentFile(document.viewUrl).subscribe({
      next: (blob) => {
        // Remove previous preview if it exists
        this.removePreview(code);

        // =================================================
        // DETERMINE CONTENT TYPE
        // =================================================

        const contentType = blob.type || document.contentType || '';

        // =================================================
        // CREATE IMAGE PREVIEW
        // =================================================

        if (contentType.toLowerCase().startsWith('image/')) {
          this.previewUrls[code] = URL.createObjectURL(blob);
        }

        console.log('[Documents] Existing document preview loaded:', {
          documentType: code,
          fileName: document.fileName,
          contentType
        });

        this.changeDetectorRef.detectChanges();
      },

      error: (error) => {
        console.error('[Documents] Failed to load existing document preview:', {
          documentType: code,
          fileName: document.fileName,
          viewUrl: document.viewUrl,
          error
        });
      }
    });
  }

  // =====================================================
  // FILE SELECTED
  // =====================================================

  onFileSelected(event: Event, documentType: CoopDocumentType): void {
    if (this.isReadOnly) {
      return;
    }

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    this.handleFile(file, documentType);

    // Allow selecting the same file again
    input.value = '';
  }

  // =====================================================
  // DRAG OVER
  // =====================================================

  onDragOver(event: DragEvent): void {
    if (this.isReadOnly) {
      return;
    }

    event.preventDefault();

    event.stopPropagation();
  }

  // =====================================================
  // DROP FILE
  // =====================================================

  onFileDrop(event: DragEvent, documentType: CoopDocumentType): void {
    if (this.isReadOnly) {
      return;
    }

    event.preventDefault();

    event.stopPropagation();

    if (!event.dataTransfer || event.dataTransfer.files.length === 0) {
      return;
    }

    const file = event.dataTransfer.files[0];

    this.handleFile(file, documentType);
  }

  // =====================================================
  // HANDLE FILE
  // =====================================================

  private handleFile(file: File, documentType: CoopDocumentType): void {
    if (this.isReadOnly) {
      return;
    }

    const code = documentType.code;

    // ===================================================
    // IMAGE ONLY VALIDATION
    // ===================================================

    const imagesOnly = documentType.imagesOnly === true || documentType.imagesOnly === 'true';

    if (imagesOnly && !file.type.startsWith('image/')) {
      this.fileErrors[code] = 'Only image files are allowed.';

      this.selectedFiles[code] = null;

      this.removePreview(code);

      this.changeDetectorRef.detectChanges();

      return;
    }

    // ===================================================
    // FILE SIZE VALIDATION
    // ===================================================

    if (file.size > this.maxFileSize) {
      this.fileErrors[code] = 'File size must not exceed 10 MB.';

      this.selectedFiles[code] = null;

      this.removePreview(code);

      this.changeDetectorRef.detectChanges();

      return;
    }

    // ===================================================
    // CLEAR STALE ERRORS
    // ===================================================

    delete this.fileErrors[code];

    delete this.fileErrors['_general'];

    // ===================================================
    // SAVE FILE
    // =====================================================

    this.selectedFiles[code] = file;

    // =====================================================
    // IMAGE PREVIEW
    // =====================================================

    this.removePreview(code);

    if (file.type.startsWith('image/')) {
      this.previewUrls[code] = URL.createObjectURL(file);
    }

    // =====================================================
    // LOG
    // =====================================================

    console.log('[Documents] File selected:', {
      documentType: code,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type
    });

    this.changeDetectorRef.detectChanges();
  }

  // =====================================================
  // GET SELECTED FILE
  // =====================================================

  getSelectedFile(documentType: string): File | null {
    return this.selectedFiles[documentType] ?? null;
  }

  // =====================================================
  // GET PREVIEW URL
  // =====================================================

  getPreviewUrl(documentType: string): string | null {
    return this.previewUrls[documentType] ?? null;
  }

  // =====================================================
  // GET FILE ERROR
  // =====================================================

  getFileError(documentType: string): string | null {
    return this.fileErrors[documentType] ?? null;
  }

  // =====================================================
  // REMOVE FILE
  // =====================================================

  removeFile(documentType: string): void {
    if (this.isReadOnly) {
      return;
    }

    this.selectedFiles[documentType] = null;

    delete this.fileErrors[documentType];

    this.removePreview(documentType);

    this.changeDetectorRef.detectChanges();
  }

  // =====================================================
  // FORMAT FILE SIZE
  // =====================================================

  formatFileSize(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }

    const units = [
      'Bytes',
      'KB',
      'MB',
      'GB'
    ];

    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, index)).toFixed(2)) + ' ' + units[index];
  }

  // =====================================================
  // CHECK FILE VALIDITY
  // =====================================================

  isFileValid(documentType: string): boolean {
    return !!this.selectedFiles[documentType] && !this.fileErrors[documentType];
  }

  // =====================================================
  // HAS FILE ERRORS
  // =====================================================

  get hasFileErrors(): boolean {
    return Object.keys(this.fileErrors).length > 0;
  }

  // =====================================================
  // CHECK AT LEAST ONE FILE
  // =====================================================

  get hasSelectedFile(): boolean {
    return Object.values(this.selectedFiles).some((file) => !!file);
  }

  // =====================================================
  // UPLOAD DOCUMENTS
  // =====================================================

  uploadDocuments(): void {
    if (this.isReadOnly) {
      return;
    }

    // ===================================================
    // AT LEAST ONE DOCUMENT REQUIRED
    // ===================================================

    if (!this.hasSelectedFile) {
      console.warn('[Documents] At least one document is required.');

      this.fileErrors['_general'] = 'Please select at least one document to upload.';

      this.changeDetectorRef.detectChanges();

      return;
    }

    // ===================================================
    // CHECK FILE VALIDATION ERRORS
    // ===================================================

    const hasErrors = Object.keys(this.fileErrors).some((key) => key !== '_general');

    if (hasErrors) {
      console.warn('[Documents] Please fix file errors before uploading.');

      this.changeDetectorRef.detectChanges();

      return;
    }

    // ===================================================
    // CLEAR GENERAL ERROR
    // ===================================================

    delete this.fileErrors['_general'];

    // ===================================================
    // CREATE FORM DATA
    // ===================================================

    const formData = new FormData();

    let hasFile = false;

    // ===================================================
    // APPEND SELECTED FILES
    // ===================================================

    this.documentTypes.forEach((documentType) => {
      const file = this.selectedFiles[documentType.code];

      if (file) {
        formData.append(documentType.code, file, file.name);

        hasFile = true;
      }
    });

    // ===================================================
    // SAFETY CHECK
    // ===================================================

    if (!hasFile) {
      console.warn('[Documents] No documents selected.');

      return;
    }

    // ===================================================
    // START UPLOAD
    // =====================================================

    this.isUploading = true;

    console.log('[Documents] Uploading documents...');

    // =====================================================
    // API CALL
    // =====================================================

    this.documentService.uploadDocuments(formData).subscribe({
      // =================================================
      // SUCCESS
      // =================================================

      next: (response) => {
        this.isUploading = false;

        console.log('[Documents] Upload response:', response);

        // ===============================================
        // MERGE UPLOADED DOCUMENTS
        // ===============================================

        this.mergeUploadedDocuments(response.uploaded);

        // ===============================================
        // CLEAR SUCCESSFULLY UPLOADED FILES
        // ===============================================

        response.uploaded.forEach((uploadedDocument) => {
          const code = uploadedDocument.docType;

          this.selectedFiles[code] = null;

          this.removePreview(code);

          delete this.fileErrors[code];
        });

        this.changeDetectorRef.detectChanges();

        // ===============================================
        // GO TO SUCCESS PAGE
        // ===============================================

        this.router.navigate([
          '/coop/success'
        ]);
      },

      // =================================================
      // ERROR
      // =================================================

      error: (error) => {
        this.isUploading = false;

        console.error('[Documents] Upload failed:', error);

        this.changeDetectorRef.detectChanges();
      }
    });
  }

  // =====================================================
  // REMOVE PREVIEW
  // =====================================================

  private removePreview(documentType: string): void {
    const previewUrl = this.previewUrls[documentType];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);

      delete this.previewUrls[documentType];
    }
  }

  // =====================================================
  // MERGE UPLOADED DOCUMENTS
  // =====================================================

  private mergeUploadedDocuments(documents: CoopUploadedDocument[]): void {
    documents.forEach((uploadedDocument) => {
      const existingIndex = this.uploadedDocuments.findIndex(
        (document) => document.docType === uploadedDocument.docType
      );

      if (existingIndex >= 0) {
        this.uploadedDocuments[existingIndex] = uploadedDocument;
      } else {
        this.uploadedDocuments.push(uploadedDocument);
      }
    });
  }

  // =====================================================
  // FIND UPLOADED DOCUMENT
  // =====================================================

  getUploadedDocument(documentType: string): CoopUploadedDocument | undefined {
    return this.uploadedDocuments.find((document) => document.docType === documentType);
  }

  // =====================================================
  // VIEW DOCUMENT
  // =====================================================

  viewDocument(document: CoopUploadedDocument): void {
    console.log('[Documents] Viewing document:', document.fileName);

    // =====================================================
    // USE ALREADY LOADED PREVIEW
    // =====================================================

    const existingPreview = this.previewUrls[document.docType];

    if (existingPreview) {
      this.selectedDocument = document;

      this.selectedDocumentPreviewUrl = existingPreview;

      this.isDocumentViewerOpen = true;

      this.changeDetectorRef.detectChanges();

      return;
    }

    // =====================================================
    // FALLBACK: LOAD DOCUMENT
    // =====================================================

    if (!document.viewUrl) {
      console.warn('[Documents] Document has no viewUrl:', document);

      return;
    }

    this.documentService.getDocumentFile(document.viewUrl).subscribe({
      next: (blob) => {
        const previewUrl = URL.createObjectURL(blob);

        this.selectedDocument = document;

        this.selectedDocumentPreviewUrl = previewUrl;

        this.isDocumentViewerOpen = true;

        this.changeDetectorRef.detectChanges();
      },

      error: (error) => {
        console.error('[Documents] Failed to view document:', error);
      }
    });
  }

  // =====================================================
  // CLOSE DOCUMENT VIEWER
  // =====================================================

  closeDocumentViewer(): void {
    const currentUrl = this.selectedDocumentPreviewUrl;

    const existingPreview = this.selectedDocument ? this.previewUrls[this.selectedDocument.docType] : null;

    // Only revoke temporary viewer URL
    if (currentUrl && currentUrl !== existingPreview) {
      URL.revokeObjectURL(currentUrl);
    }

    this.isDocumentViewerOpen = false;

    this.selectedDocument = null;

    this.selectedDocumentPreviewUrl = null;

    this.changeDetectorRef.detectChanges();
  }
}
