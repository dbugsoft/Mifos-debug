/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface CoopDocumentType {
  code: string;
  label: string;
  imagesOnly: string | boolean;
}

export interface CoopUploadedDocument {
  id: number;
  docType: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  viewUrl: string;
  downloadUrl: string;
  replacedPrevious: boolean;
  unchanged: boolean;
}

export interface CoopDocumentsUploadResponse {
  uploaded: CoopUploadedDocument[];
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class CoopDocumentService {
  private http = inject(HttpClient);

  // =====================================================
  // PUBLIC DOCUMENT APIs
  // =====================================================

  private readonly publicDocumentsUrl = `${environment.coopApiUrl}/nepal/coop-registration/public/documents`;

  private readonly publicDocumentTypesUrl = `${environment.coopApiUrl}/nepal/coop-registration/public/document-types`;

  // =====================================================
  // ADMIN DOCUMENT API
  // =====================================================

  private readonly adminDocumentsUrl = `${environment.coopApiUrl}/nepal/coop-registration/admin`;

  // =====================================================
  // GET UPLOADED DOCUMENTS - PUBLIC
  // =====================================================

  getUploadedDocuments(): Observable<CoopUploadedDocument[]> {
    return this.http.get<CoopUploadedDocument[]>(this.publicDocumentsUrl);
  }

  // =====================================================
  // GET ADMIN DOCUMENTS
  // =====================================================

  getAdminDocuments(appUserId: number): Observable<CoopUploadedDocument[]> {
    return this.http.get<CoopUploadedDocument[]>(`${this.adminDocumentsUrl}/${appUserId}/documents`);
  }

  // =====================================================
  // DOCUMENT TYPES - PUBLIC
  // =====================================================

  getDocumentTypes(): Observable<CoopDocumentType[]> {
    return this.http.get<CoopDocumentType[]>(this.publicDocumentTypesUrl);
  }

  // =====================================================
  // UPLOAD DOCUMENTS - PUBLIC
  // =====================================================

  uploadDocuments(formData: FormData): Observable<CoopDocumentsUploadResponse> {
    return this.http.post<CoopDocumentsUploadResponse>(this.publicDocumentsUrl, formData);
  }

  // =====================================================
  // VIEW / DOWNLOAD DOCUMENT
  // =====================================================

  getDocumentFile(url: string): Observable<Blob> {
    const fullUrl = url.startsWith('http') ? url : `${environment.baseApiUrl}${url}`;

    return this.http.get(fullUrl, {
      responseType: 'blob'
    });
  }
}
