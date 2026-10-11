/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, HostListener, OnDestroy, ChangeDetectorRef, OnInit, inject } from '@angular/core';

import { CommonModule } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';

import { Subject, takeUntil, distinctUntilChanged, map, from } from 'rxjs';

import { QueryClient } from '@tanstack/angular-query-experimental';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { CoopDocumentService, CoopDocumentType, CoopUploadedDocument } from '../../services/coop-document.service';

import { CoopAdminRegistration, CoopAdminService } from '../../services/coop-admin.service';

import { CoopAdminNavbarComponent } from '../coop-admin-navbar/coop-admin-navbar.component';

import { adminDetailQueryOptions } from '../../queries/coop-admin.queries';

import {
  adminDocumentsQueryOptions,
  documentThumbnailQueryOptions,
  documentTypesQueryOptions
} from '../../queries/coop-document.queries';

@Component({
  selector: 'mifosx-coop-admin-documents',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    CoopAdminNavbarComponent
  ],

  templateUrl: './coop-admin-documents.component.html',
  styleUrl: './coop-admin-documents.component.scss'
})
export class CoopAdminDocumentsComponent implements OnInit, OnDestroy {
  private readonly documentService = inject(CoopDocumentService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly coopAdminService = inject(CoopAdminService);

  /**
   * Shared TanStack Query cache (provided at the CoopModule level -
   * see coop.module.ts). Used here via ensureQueryData() so repeat
   * navigations to the same cooperative reuse cached data instead of
   * re-issuing the same GET request, exactly like the caching
   * already used by coop-admin-detail/admin-power for the same
   * cooperative record.
   */
  private readonly queryClient = inject(QueryClient);

  private readonly fb = inject(FormBuilder);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Cooperative appUserId from route.
   *
   * Example:
   * /coop/admin/31/documents
   *
   * IMPORTANT:
   * The admin documents API expects appUserId,
   * not cooperative.id.
   */
  appUserId: number | null = null;

  /**
   * Documents returned by admin API.
   */
  uploadedDocuments: CoopUploadedDocument[] = [];

  /**
   * Document type definitions.
   */
  documentTypes: CoopDocumentType[] = [];

  /**
   * Page loading state.
   */
  documentsLoading = false;

  /**
   * Page error.
   */
  documentsError = '';

  /**
   * Viewer state.
   */
  documentViewerOpen = false;

  selectedDocument: CoopUploadedDocument | null = null;

  documentViewerLoading = false;

  selectedDocumentPreviewUrl = '';

  selectedPdfPreviewUrl: SafeResourceUrl | null = null;

  /**
   * Thumbnail object URLs for image documents.
   *
   * These are loaded independently after the document
   * metadata arrives so thumbnails never block the
   * document cards from appearing.
   */
  thumbnailUrls: Record<number, string> = {};

  /**
   * Object URL used by the document viewer for files
   * fetched specifically when View is clicked.
   */
  private viewerObjectUrl: string | null = null;

  private readonly destroy$ = new Subject<void>();

  // =====================================================
  // COOPERATIVE STATUS
  // VERIFY / PROVISION / ACTIVATE
  // =====================================================

  cooperative: CoopAdminRegistration | null = null;

  isVerifying = false;

  isActivating = false;

  actionSuccessMessage = '';

  actionErrorMessage = '';

  verifyForm = this.fb.nonNullable.group({
    remarks: [
      '',
      Validators.required
    ]
  });

  activateForm = this.fb.nonNullable.group({
    remarks: ['']
  });

  // =====================================================
  // INITIALIZATION
  // =====================================================

  /**
   * React to route parameter changes.
   *
   * RouteReuseStrategy may reuse this component instance
   * when moving between:
   *
   * /coop/admin/31/documents
   * /coop/admin/32/documents
   *
   * Therefore we subscribe to paramMap instead of using
   * snapshot only once.
   */
  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((paramMap) => paramMap.get('id')),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((idParam) => {
        const id = Number(idParam);

        this.appUserId = Number.isFinite(id) && id > 0 ? id : null;

        this.loadDocuments();

        this.loadCooperative();
      });
  }

  // =====================================================
  // LOAD COOPERATIVE
  // =====================================================

  /**
   * Load the cooperative's admin record so the
   * verify / activate actions can use its current status.
   */
  private loadCooperative(): void {
    this.cooperative = null;

    this.actionSuccessMessage = '';

    this.actionErrorMessage = '';

    if (this.appUserId === null) {
      return;
    }

    from(this.queryClient.query(adminDetailQueryOptions(this.coopAdminService, this.appUserId)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cooperative) => {
          this.cooperative = cooperative;
        },

        error: (error) => {
          console.error('Failed to load cooperative status:', error);
        }
      });
  }

  // =====================================================
  // VERIFY COOPERATIVE
  // PENDING -> PROVISIONED
  // =====================================================

  submitVerify(): void {
    const cooperative = this.cooperative;

    if (!cooperative) {
      return;
    }

    this.actionSuccessMessage = '';

    this.actionErrorMessage = '';

    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();

      return;
    }

    const remarks = this.verifyForm.getRawValue().remarks;

    this.isVerifying = true;

    this.coopAdminService
      .verifyCooperative(cooperative.appUserId, remarks)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.isVerifying = false;

          this.cooperative = updated;

          this.actionSuccessMessage = 'Cooperative verified and tenant provisioned successfully.';

          this.verifyForm.reset();
        },

        error: (error) => {
          this.isVerifying = false;

          console.error('Failed to verify cooperative:', error);

          this.actionErrorMessage = 'Unable to verify this cooperative. Please try again.';
        }
      });
  }

  // =====================================================
  // ACTIVATE TENANT
  // PROVISIONED -> ACTIVE
  // =====================================================

  confirmActivate(): void {
    const cooperative = this.cooperative;

    if (!cooperative) {
      return;
    }

    if (cooperative.status !== 'PROVISIONED') {
      this.actionErrorMessage = 'Only a provisioned tenant can be activated.';

      return;
    }

    this.actionSuccessMessage = '';

    this.actionErrorMessage = '';

    this.isActivating = true;

    this.coopAdminService
      .activateCooperative(cooperative.appUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.isActivating = false;

          this.cooperative = updated;

          this.actionSuccessMessage = 'Tenant has been activated successfully.';

          this.activateForm.reset();
        },

        error: (error: any) => {
          this.isActivating = false;

          console.error('Failed to activate tenant:', error);

          if (error?.status === 403) {
            this.actionErrorMessage = 'You are not authorized to activate this tenant.';
          } else {
            this.actionErrorMessage = 'Unable to activate this tenant. Please try again.';
          }
        }
      });
  }

  // =====================================================
  // LOAD ADMIN DOCUMENTS
  // =====================================================

  /**
   * Load document metadata for the current cooperative.
   *
   * IMPORTANT:
   *
   * Admin endpoint:
   *
   * GET
   * /nepal/coop-registration/admin/{appUserId}/documents
   *
   * Example:
   *
   * /nepal/coop-registration/admin/31/documents
   *
   * The admin API returns a direct array:
   *
   * [
   *   {
   *     id: 34,
   *     docType: 'PAN',
   *     ...
   *   }
   * ]
   *
   * It does NOT return:
   *
   * {
   *   uploaded: [...]
   * }
   */
  loadDocuments(): void {
    this.documentsLoading = true;

    this.documentsError = '';
    console.log('[Admin Documents] loadDocuments() called', Date.now(), 'appUserId:', this.appUserId);
    /*
     * Safety net: force the skeleton off after 2s regardless
     * of what happens to the request (dropped subscription,
     * a hung connection, etc.) so it can never get stuck on
     * screen indefinitely. The normal success/error paths
     * below already clear it well before this in practice.
     */
    const loadingTimeout = window.setTimeout(() => {
      this.documentsLoading = false;
    }, 2000);

    /*
     * Reset previous cooperative's thumbnails.
     */
    Object.values(this.thumbnailUrls).forEach((url) => {
      URL.revokeObjectURL(url);
    });

    this.thumbnailUrls = {};

    /*
     * Clear old documents immediately so the previous
     * cooperative's documents are never displayed while
     * the new request is loading.
     */
    this.uploadedDocuments = [];

    /*
     * A valid appUserId is required for the admin endpoint.
     */
    if (this.appUserId === null) {
      window.clearTimeout(loadingTimeout);

      this.documentsLoading = false;

      this.documentsError = 'Unable to identify the cooperative.';

      return;
    }

    // =====================================================
    // DOCUMENT TYPES
    // =====================================================

    /*
     * Document types are only metadata used for labels.
     *
     * This request does NOT control documentsLoading.
     */
    from(this.queryClient.query(documentTypesQueryOptions(this.documentService)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          console.log('[Admin Documents] API NEXT received:', Date.now(), types);

          this.documentTypes = types ?? [];
        },

        error: (error) => {
          console.error('Failed to load document types:', error);

          this.documentTypes = [];
        }
      });

    // =====================================================
    // ADMIN DOCUMENTS
    // =====================================================

    /*
     * IMPORTANT:
     *
     * DO NOT use:
     *
     * getUploadedDocuments()
     *
     * because that is the public cooperative endpoint.
     *
     * Admin must use:
     *
     * getAdminDocuments(appUserId)
     */
    from(this.queryClient.query(adminDocumentsQueryOptions(this.documentService, this.appUserId)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        // Inside loadDocuments() -> next handler
        next: (documents) => {
          this.uploadedDocuments = documents ?? [];
          this.documentsLoading = false;
          window.clearTimeout(loadingTimeout);

          // Explicitly trigger UI update for uploaded documents
          this.cdr.detectChanges();

          this.loadThumbnails(this.uploadedDocuments);
        },

        error: (error) => {
          console.error('[Admin Documents] Failed to load cooperative documents:', error);

          this.uploadedDocuments = [];

          this.documentsLoading = false;

          window.clearTimeout(loadingTimeout);

          this.documentsError = 'Unable to load submitted documents. Please try again.';
        }
      });
  }

  // =====================================================
  // LOAD IMAGE THUMBNAILS
  // =====================================================

  /**
   * Pre-fetch image files for thumbnails.
   *
   * Non-image documents such as PDFs are NOT fetched here.
   * They are fetched only when the admin clicks View.
   *
   * Thumbnail requests are independent so one slow image
   * does not block the others.
   */
  private loadThumbnails(documents: CoopUploadedDocument[]): void {
    documents
      .filter((document) => this.isImage(document))
      .forEach((document) => {
        from(this.queryClient.query(documentThumbnailQueryOptions(this.documentService, document.id, document.viewUrl)))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            // Inside loadThumbnails() -> next handler
            next: (blob) => {
              const objectUrl = URL.createObjectURL(blob);
              this.thumbnailUrls[document.id] = objectUrl;

              // Trigger UI update when each thumbnail finishes loading
              this.cdr.detectChanges();
            },

            error: (error) => {
              console.error('Failed to load thumbnail:', document.fileName, error);
            }
          });
      });
  }

  // =====================================================
  // FIND UPLOADED DOCUMENT BY TYPE
  // =====================================================

  /**
   * Look up the uploaded document (if any) for a given
   * document type code.
   *
   * Used to lay the grid out by document TYPE (a fixed
   * set of expected slots) rather than only by what has
   * actually been uploaded, so a type with nothing
   * submitted yet can still render its own placeholder
   * slot instead of being left out entirely.
   */
  getUploadedDocument(docTypeCode: string): CoopUploadedDocument | undefined {
    return this.uploadedDocuments.find((document) => document.docType === docTypeCode);
  }

  // =====================================================
  // ORDERED DOCUMENT TYPES
  // =====================================================

  /**
   * Fixed display order for the document grid:
   *
   * Row 1: Board Decision, PAN Certificate,
   *        Authorized Person Citizenship
   * Row 2: Registration Certificate, Logo
   *
   * Matched against each type's label (case-insensitive)
   * rather than its code, since the exact backend code
   * values aren't something this presentation-only helper
   * should need to hardcode. Any type that doesn't match
   * one of these keywords still renders - it's just placed
   * after the ones that do, so nothing is ever silently
   * dropped from the grid.
   */
  private readonly documentTypeDisplayOrder: string[] = [
    'board decision',
    'pan certificate',
    'authorized person',
    'registration certificate',
    'logo'
  ];

  /**
   * documentTypes sorted into the fixed display order above.
   */
  getOrderedDocumentTypes(): CoopDocumentType[] {
    return [...this.documentTypes].sort(
      (a, b) => this.getDocumentTypeOrderIndex(a.label) - this.getDocumentTypeOrderIndex(b.label)
    );
  }

  private getDocumentTypeOrderIndex(label: string): number {
    const normalizedLabel = (label || '').toLowerCase();

    const index = this.documentTypeDisplayOrder.findIndex((keyword) => normalizedLabel.includes(keyword));

    return index === -1 ? this.documentTypeDisplayOrder.length : index;
  }

  // =====================================================
  // TRACK BY — DOCUMENT TYPE
  // =====================================================

  trackByDocumentTypeCode(_index: number, documentType: CoopDocumentType): string {
    return documentType.code;
  }

  // =====================================================
  // THUMBNAIL URL
  // =====================================================

  /**
   * Return the loaded thumbnail URL for an image document.
   */
  getThumbnailUrl(uploadedDocument: CoopUploadedDocument): string | null {
    return this.thumbnailUrls[uploadedDocument.id] ?? null;
  }

  // =====================================================
  // DOCUMENT LABEL
  // =====================================================

  /**
   * Get friendly document name.
   */
  getDocumentLabel(uploadedDocument: CoopUploadedDocument): string {
    const documentType = this.documentTypes.find((type) => type.code === uploadedDocument.docType);

    return documentType?.label || this.formatDocumentType(uploadedDocument.docType);
  }

  /**
   * Convert:
   *
   * AUTHORIZED_PERSON_CITIZENSHIP
   *
   * into:
   *
   * Authorized Person Citizenship
   */
  private formatDocumentType(docType: string): string {
    if (!docType) {
      return 'Document';
    }

    return docType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  // =====================================================
  // DOCUMENT ICON
  // =====================================================

  /**
   * Return suitable icon based on file type.
   */
  getDocumentIcon(uploadedDocument: CoopUploadedDocument): string {
    const contentType = uploadedDocument.contentType?.toLowerCase() || '';

    if (contentType.includes('pdf')) {
      return 'picture_as_pdf';
    }

    if (contentType.includes('word') || contentType.includes('officedocument.word')) {
      return 'description';
    }

    if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
      return 'table_chart';
    }

    if (contentType.startsWith('image/')) {
      return 'image';
    }

    return 'insert_drive_file';
  }

  // =====================================================
  // FILE TYPE HELPERS
  // =====================================================

  /**
   * Check whether document is an image.
   */
  isImage(uploadedDocument: CoopUploadedDocument): boolean {
    return !!uploadedDocument.contentType?.toLowerCase().startsWith('image/');
  }

  /**
   * Check whether document is PDF.
   */
  isPdf(uploadedDocument: CoopUploadedDocument): boolean {
    return uploadedDocument.contentType?.toLowerCase() === 'application/pdf';
  }

  // =====================================================
  // FILE SIZE
  // =====================================================

  /**
   * Format file size.
   */
  formatDocumentSize(bytes: number): string {
    if (!bytes || bytes <= 0) {
      return '0 KB';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  // =====================================================
  // DOCUMENT VIEWER
  // =====================================================

  /**
   * Open document viewer.
   *
   * Image thumbnails already loaded in the grid are reused
   * immediately.
   *
   * PDFs and other non-image documents are fetched only
   * when View is clicked.
   */
  viewDocument(uploadedDocument: CoopUploadedDocument): void {
    /*
     * Clean up any previous viewer object URL first.
     */
    if (this.viewerObjectUrl) {
      URL.revokeObjectURL(this.viewerObjectUrl);

      this.viewerObjectUrl = null;
    }

    this.selectedDocument = uploadedDocument;

    this.documentViewerOpen = true;

    this.selectedPdfPreviewUrl = null;

    const cachedThumbnail = this.thumbnailUrls[uploadedDocument.id];

    /*
     * Image already loaded:
     * open immediately without another request.
     */
    if (this.isImage(uploadedDocument) && cachedThumbnail) {
      this.selectedDocumentPreviewUrl = cachedThumbnail;

      this.documentViewerLoading = false;

      return;
    }

    this.selectedDocumentPreviewUrl = '';

    this.documentViewerLoading = true;

    /*
     * Fetch the actual document for the viewer.
     */
    this.documentService
      .getDocumentFile(uploadedDocument.viewUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);

          this.viewerObjectUrl = objectUrl;

          /*
           * Image preview.
           */
          if (this.isImage(uploadedDocument)) {
            this.selectedDocumentPreviewUrl = objectUrl;
          }

          /*
           * PDF preview.
           */
          if (this.isPdf(uploadedDocument)) {
            this.selectedPdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
          }

          this.documentViewerLoading = false;
        },

        error: (error) => {
          console.error('Failed to preview document:', error);

          this.selectedDocumentPreviewUrl = '';

          this.selectedPdfPreviewUrl = null;

          this.documentViewerLoading = false;
        }
      });
  }

  // =====================================================
  // ESCAPE KEY
  // =====================================================

  /**
   * Close viewer when Escape is pressed.
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.documentViewerOpen) {
      this.closeDocumentViewer();
    }
  }

  // =====================================================
  // CLOSE VIEWER
  // =====================================================

  /**
   * Close document viewer.
   */
  closeDocumentViewer(): void {
    this.documentViewerOpen = false;

    this.selectedDocument = null;

    this.selectedDocumentPreviewUrl = '';

    this.selectedPdfPreviewUrl = null;

    this.documentViewerLoading = false;

    if (this.viewerObjectUrl) {
      URL.revokeObjectURL(this.viewerObjectUrl);

      this.viewerObjectUrl = null;
    }
  }

  // =====================================================
  // DOWNLOAD
  // =====================================================

  /**
   * Download document.
   *
   * Uses backend-provided downloadUrl.
   */
  downloadDocument(uploadedDocument: CoopUploadedDocument): void {
    this.documentService
      .getDocumentFile(uploadedDocument.downloadUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);

          const anchor = window.document.createElement('a');

          anchor.href = objectUrl;

          anchor.download = uploadedDocument.fileName || 'document';

          anchor.style.display = 'none';

          window.document.body.appendChild(anchor);

          anchor.click();

          anchor.remove();

          setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
          }, 1000);
        },

        error: (error) => {
          console.error('Failed to download document:', error);
        }
      });
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  /**
   * Navigate back to cooperative detail.
   */
  goBack(): void {
    if (this.appUserId !== null) {
      this.router.navigate([
        '/coop/admin',
        this.appUserId
      ]);

      return;
    }

    this.router.navigate([
      '/coop/admin'
    ]);
  }

  /**
   * Navigate to power management page.
   */
  goToPower(): void {
    if (this.appUserId !== null) {
      this.router.navigate([
        '/coop',
        'admin',
        this.appUserId,
        'power'
      ]);

      return;
    }

    this.router.navigate([
      '/coop',
      'admin'
    ]);
  }

  // =====================================================
  // TRACK BY
  // =====================================================

  /**
   * trackBy for the document list.
   */
  trackByDocumentId(_index: number, uploadedDocument: CoopUploadedDocument): number {
    return uploadedDocument.id;
  }

  // =====================================================
  // DESTROY
  // =====================================================

  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();

    /*
     * Revoke all thumbnail object URLs.
     */
    Object.values(this.thumbnailUrls).forEach((url) => {
      URL.revokeObjectURL(url);
    });

    /*
     * Revoke viewer object URL.
     */
    if (this.viewerObjectUrl) {
      URL.revokeObjectURL(this.viewerObjectUrl);

      this.viewerObjectUrl = null;
    }
  }
}
