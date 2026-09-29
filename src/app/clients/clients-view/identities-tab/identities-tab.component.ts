/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow,
  MatFooterCellDef,
  MatFooterCell,
  MatFooterRowDef,
  MatFooterRow
} from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';

/** Custom Components */
import { DeleteDialogComponent } from '../../../shared/delete-dialog/delete-dialog.component';
import { UploadDocumentDialogComponent } from '../custom-dialogs/upload-document-dialog/upload-document-dialog.component';

/** Custom Services */
import lightGallery from 'lightgallery';
import lgFullscreen from 'lightgallery/plugins/fullscreen';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';
import type { LightGallery } from 'lightgallery/lightgallery';
import type { GalleryItem } from 'lightgallery/lg-utils';
import { DocumentPreviewService } from 'app/shared/services/document-preview.service';
import { TranslateService } from '@ngx-translate/core';
import { ClientsService } from '../../clients.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Identities Tab Component
 */
@Component({
  selector: 'mifosx-identities-tab',
  templateUrl: './identities-tab.component.html',
  styleUrls: ['./identities-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatFooterCellDef,
    MatFooterCell,
    MatFooterRowDef,
    MatFooterRow
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IdentitiesTabComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private clientService = inject(ClientsService);
  private translateService = inject(TranslateService);
  private documentPreviewService = inject(DocumentPreviewService);
  private changeDetectorRef = inject(ChangeDetectorRef);

  private destroyRef = inject(DestroyRef);

  /** Client Identities */
  clientIdentities: any;
  /** Client Identifier Template */
  clientIdentifierTemplate: any;
  /** Client Id */
  clientId: string;
  /** Identities Columns */
  identitiesColumns: string[] = [
    'id',
    'description',
    'type',
    'documentKey',
    'documents',
    'status',
    'actions'
  ];

  /** Identifiers Table */
  @ViewChild('identifiersTable', { static: true }) identifiersTable: MatTable<Element>;
  /** LightGallery host */
  @ViewChild('identityLightbox', { static: true }) identityLightbox: ElementRef<HTMLElement>;

  /** Cached thumbnails for previewable docs */
  previewThumbnails: Record<string, string> = {};

  /**
   * Set when Add fails because this document type already exists on
   * this client - `highlightedIdentityId` points at the existing row
   * so the user is directed there instead of being left in the form.
   */
  duplicateTypeMessage: string | null = null;
  highlightedIdentityId: any = null;
  private highlightTimeout: ReturnType<typeof setTimeout> | null = null;

  private lightboxInstance: LightGallery | null = null;
  private readonly lightboxPlugins = [
    lgZoom,
    lgThumbnail,
    lgFullscreen
  ];

  /**
   * @param {ActivatedRoute} route Activated Route
   * @param {MatDialog} dialog Mat Dialog
   * @param {ClientsService} clientService Clients Service
   * @param {TranslateService} translateService Translate Service
   * @param {DocumentPreviewService} documentPreviewService Preview helper
   */
  constructor() {
    this.clientId = this.route.parent.snapshot.paramMap.get('clientId');
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: { clientIdentities: any; clientIdentifierTemplate: any }) => {
        this.clientIdentities = data.clientIdentities;
        this.clientIdentifierTemplate = data.clientIdentifierTemplate;
        this.prefetchThumbnails();
      });
  }

  ngOnDestroy(): void {
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
    this.destroyLightbox();
    if (Array.isArray(this.clientIdentities)) {
      this.clientIdentities.forEach((identity: any) => {
        identity.documents?.forEach((doc: any) => this.documentPreviewService.release(doc.id));
      });
    }
  }

  /** TrackBy function for documents ngFor */
  trackByDocumentId(_: number, doc: any): any {
    return doc?.id;
  }

  /**
   * Builds the allowedDocumentTypes/statusOptions dialog data shared by
   * the Add and Edit identifier flows.
   */
  private buildIdentifierDialogOptions(): { allowedDocumentTypes: any[]; statusOptions: any[] } {
    const translatedDocTypes = this.clientIdentifierTemplate.allowedDocumentTypes.map((docType: any) => ({
      ...docType,
      name: this.translateService.instant(`labels.catalogs.${docType.name}`)
    }));

    const statusOptions = [
      { label: this.translateService.instant('labels.catalogs.Active'), value: 'Active' },
      { label: this.translateService.instant('labels.catalogs.Inactive'), value: 'Inactive' }
    ];

    return { allowedDocumentTypes: translatedDocTypes, statusOptions };
  }

  /**
   * Handles the one error Add needs special treatment for: the
   * document type the user picked already exists on this client.
   * Retrying with the same type can never succeed (it's a one-per-type
   * rule, not a typo to fix), so instead of leaving the user in the
   * form, this shows a message and points them at the existing row.
   * Returns false for any other error, so the caller's normal
   * (console.error) handling still runs for those.
   */
  private handleDuplicateDocumentType(
    err: any,
    documentTypeId: number,
    dialogRef: MatDialogRef<UploadDocumentDialogComponent>
  ): boolean {
    const apiError = err?.error?.errors?.[0];
    const isDuplicateType =
      apiError?.userMessageGlobalisationCode === 'error.msg.clientIdentifier.type.duplicate' ||
      (err?.status === 403 && apiError?.parameterName === 'documentTypeId');

    if (!isDuplicateType) {
      return false;
    }

    dialogRef.close();

    const existing = Array.isArray(this.clientIdentities)
      ? this.clientIdentities.find((identity: any) => identity.documentType?.id === documentTypeId)
      : null;

    const docType = this.clientIdentifierTemplate.allowedDocumentTypes.find((dt: any) => dt.id === documentTypeId);
    this.duplicateTypeMessage = `${docType?.name ?? 'This document type'} already exists.`;
    this.highlightedIdentityId = existing?.id ?? null;

    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
    this.highlightTimeout = setTimeout(() => {
      this.duplicateTypeMessage = null;
      this.highlightedIdentityId = null;
      this.changeDetectorRef.detectChanges();
    }, 5000);

    if (existing) {
      // Runs after this change detection pass so the row (and its
      // highlight class) actually exist in the DOM to scroll to.
      setTimeout(() => {
        document.getElementById(`identity-row-${existing.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    this.changeDetectorRef.detectChanges();

    return true;
  }

  /**
   * The other duplicate case: this document number already belongs to
   * a different client. Unlike the type-duplicate case, this stays on
   * the form (the dialog isn't closed) - the field itself needs to
   * change, so applyServerError()'s existing parameterName -> control
   * attachment is reused as-is rather than duplicating that logic here.
   *
   * The backend's own `defaultUserMessage` for this error names the
   * other client (and their branch, and this same document key) - that
   * must never be shown to the person creating this identifier, so a
   * fixed, generic message is passed instead of the backend's text.
   */
  private handleDuplicateDocumentKey(err: any, dialogRef: MatDialogRef<UploadDocumentDialogComponent>): boolean {
    const apiError = err?.error?.errors?.[0];
    const isDuplicateKey =
      apiError?.userMessageGlobalisationCode === 'error.msg.clientIdentifier.identityKey.duplicate' ||
      (err?.status === 403 && apiError?.parameterName === 'documentKey');

    if (!isDuplicateKey) {
      return false;
    }

    dialogRef.componentInstance.applyServerError(err, 'This document key is already in use.');

    return true;
  }

  /**
   * Add Client Identifier with unified form (identifier + document upload)
   */
  addIdentifier() {
    const dialogRef = this.dialog.open(UploadDocumentDialogComponent, {
      data: {
        documentIdentifier: true,
        ...this.buildIdentifierDialogOptions()
      }
    });

    dialogRef.componentInstance.submitted.subscribe((response: any) => {
      // The dialog now closes once the identifier is actually created
      // (see the `next` handler below), not upfront - a duplicate
      // document key needs the dialog to still be open so the error
      // can be shown on the form (see handleDuplicateDocumentKey).
      // A duplicate document type still closes it (see
      // handleDuplicateDocumentType), and any other error just logs,
      // as before.
      if (response) {
        // Create identifier data
        const identifierData = {
          documentTypeId: response.documentTypeId,
          status: response.status.toUpperCase(),
          documentKey: response.documentKey,
          description: response.description
        };

        // First create the identifier
        this.clientService.addClientIdentifier(this.clientId, identifierData).subscribe({
          next: (res: any) => {
            dialogRef.close();

            const newIdentifierId = res.resourceId;
            const selectedDocType = this.clientIdentifierTemplate.allowedDocumentTypes.find(
              (doc: any) => doc.id === response.documentTypeId
            );

            // Create new identity entry
            const newIdentity: any = {
              id: newIdentifierId,
              description: response.description,
              documentType: selectedDocType,
              documentKey: response.documentKey,
              documents: [] as any[],
              clientId: this.clientId,
              status:
                response.status === 'Active'
                  ? 'clientIdentifierStatusType.active'
                  : 'clientIdentifierStatusType.inactive'
            };

            // If file was uploaded, attach document to the identifier
            if (response.file) {
              const formData: FormData = new FormData();
              formData.append('name', response.fileName);
              formData.append('file', response.file);
              this.clientService.uploadClientIdentifierDocument(newIdentifierId, formData).subscribe({
                next: (docRes: any) => {
                  const newDoc = {
                    id: docRes.resourceId,
                    parentEntityType: 'client_identifiers',
                    parentEntityId: newIdentifierId,
                    name: response.fileName,
                    fileName: response.file.name
                  };
                  newIdentity.documents.push(newDoc);
                  this.clientIdentities.push(newIdentity);
                  this.identifiersTable.renderRows();
                  this.setThumbnail(newDoc);
                },
                error: (err: any) => {
                  console.error('Failed to upload document', err);
                  // Still add the identifier even if document upload fails
                  this.clientIdentities.push(newIdentity);
                  this.identifiersTable.renderRows();
                }
              });
            } else {
              // No file, just add the identifier
              this.clientIdentities.push(newIdentity);
              this.identifiersTable.renderRows();
            }
          },
          error: (err: any) => {
            if (this.handleDuplicateDocumentType(err, identifierData.documentTypeId, dialogRef)) {
              return;
            }
            if (this.handleDuplicateDocumentKey(err, dialogRef)) {
              return;
            }
            console.error('Failed to create identifier', err);
          }
        });
      }
    });
  }

  /**
   * Edit Client Identifier with the same unified form used for Add, pre-filled
   * with the existing identity's values. Document upload is left untouched -
   * a new file is optional here and is not sent by this flow.
   * @param {any} identity Identity being edited
   */
  editIdentifier(identity: any) {
    const dialogRef = this.dialog.open(UploadDocumentDialogComponent, {
      data: {
        documentIdentifier: true,
        identity,
        ...this.buildIdentifierDialogOptions()
      }
    });

    // Unlike Add, the dialog stays open on submit here - it only closes
    // once the PUT actually succeeds, so a business/validation error
    // from the API can be shown right on the form (field-level when the
    // API names a parameterName, a general banner otherwise) instead of
    // being lost after the dialog has already closed.
    dialogRef.componentInstance.submitted.subscribe((response: any) => {
      const identifierData = {
        documentTypeId: response.documentTypeId,
        status: response.status.toUpperCase(),
        documentKey: response.documentKey,
        description: response.description
      };

      this.clientService.editClientIdentifier(this.clientId, identity.id, identifierData).subscribe({
        next: () => {
          const selectedDocType = this.clientIdentifierTemplate.allowedDocumentTypes.find(
            (doc: any) => doc.id === identifierData.documentTypeId
          );

          identity.documentType = selectedDocType;
          identity.documentKey = identifierData.documentKey;
          identity.description = identifierData.description;
          identity.status =
            identifierData.status === 'ACTIVE'
              ? 'clientIdentifierStatusType.active'
              : 'clientIdentifierStatusType.inactive';

          this.identifiersTable.renderRows();
          this.changeDetectorRef.detectChanges();

          dialogRef.close();
        },
        error: (err: any) => {
          if (this.handleDuplicateDocumentType(err, identifierData.documentTypeId, dialogRef)) {
            return;
          }
          if (this.handleDuplicateDocumentKey(err, dialogRef)) {
            return;
          }
          dialogRef.componentInstance.applyServerError(err);
        }
      });
    });
  }
  /**
   * Delete Client Identifier
   * @param {string} clientId Client Id
   * @param {string} identifierId Identifier Id
   * @param {number} index Index
   */
  deleteIdentifier(clientId: string, identifierId: string, index: number) {
    const deleteIdentifierDialogRef = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `${this.translateService.instant('labels.heading.identifier id')} : ${identifierId}` }
    });
    deleteIdentifierDialogRef.afterClosed().subscribe((response: any) => {
      if (response.delete) {
        this.clientService.deleteClientIdentifier(clientId, identifierId).subscribe((res) => {
          this.clientIdentities.splice(index, 1);
          this.identifiersTable.renderRows();
        });
      }
    });
  }

  isPreviewable(document: any): boolean {
    return this.documentPreviewService.isPreviewable(document);
  }

  async openDocumentPreview(identity: any, document: any): Promise<void> {
    if (!this.isPreviewable(document)) {
      return;
    }
    try {
      const previewableDocs = (identity.documents || []).filter((doc: any) => this.isPreviewable(doc));
      const items: GalleryItem[] = [];
      for (const doc of previewableDocs) {
        try {
          const preview = await this.documentPreviewService.resolvePreviewUrl(doc, () =>
            this.clientService.downloadClientIdentificationDocument(doc.parentEntityId || identity.id, doc.id)
          );
          if (preview.type === 'image') {
            this.previewThumbnails[doc.id] = preview.url;
          }
          items.push({
            src: preview.url,
            thumb: preview.type === 'image' ? preview.url : undefined,
            subHtml: this.buildSubHtml(doc, identity),
            iframe: preview.type === 'pdf'
          });
        } catch (error) {
          console.error('Preview failed for document', doc.id, error);
        }
      }
      if (!items.length) {
        return;
      }
      const startIndex = Math.max(
        0,
        previewableDocs.findIndex((doc: any) => doc.id === document.id)
      );
      this.destroyLightbox();
      this.lightboxInstance = lightGallery(this.identityLightbox.nativeElement, {
        dynamic: true,
        dynamicEl: items,
        plugins: this.lightboxPlugins,
        licenseKey: '0000-0000-000-0000',
        download: false,
        escKey: true,
        closable: true,
        zoomFromOrigin: true
      });
      this.lightboxInstance.openGallery(startIndex);
    } catch (error) {
      console.error('Unable to open preview', error);
    }
  }

  private buildSubHtml(document: any, identity: any): string {
    const caption = document.description
      ? `<p class="lg-caption-text">${this.escapeHtml(document.description)}</p>`
      : '';
    const identityLabel = identity?.documentKey
      ? `<p class="lg-meta">${this.escapeHtml(identity.documentKey)}</p>`
      : '';
    return `<div class="lg-caption"><h4>${this.escapeHtml(document.name || 'Document')}</h4>${caption}${identityLabel}</div>`;
  }

  private escapeHtml(value: string): string {
    return value
      ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      : '';
  }

  private destroyLightbox(): void {
    if (this.lightboxInstance) {
      this.lightboxInstance.destroy();
      this.lightboxInstance = null;
    }
  }

  private setThumbnail(document: any): void {
    if (!this.documentPreviewService.isPreviewable(document)) {
      return;
    }
    this.documentPreviewService
      .resolvePreviewUrl(document, () =>
        this.clientService.downloadClientIdentificationDocument(document.parentEntityId || this.clientId, document.id)
      )
      .then((preview) => {
        if (preview.type === 'image') {
          this.previewThumbnails[document.id] = preview.url;
          // This resolves asynchronously, outside any template-bound
          // event - on this OnPush component, the view otherwise never
          // repaints to show it, leaving the placeholder showing even
          // though the thumbnail already loaded.
          this.changeDetectorRef.markForCheck();
        }
      })
      .catch((): void => undefined);
  }

  private prefetchThumbnails(): void {
    if (!Array.isArray(this.clientIdentities)) {
      return;
    }
    this.clientIdentities.forEach((identity: any) => {
      identity.documents?.forEach((doc: any) => this.setThumbnail(doc));
    });
  }
}
