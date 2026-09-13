/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { firstValueFrom } from 'rxjs';
import { queryOptions } from '@tanstack/angular-query-experimental';

import { CoopDocumentService } from '../services/coop-document.service';
import { coopQueryKeys } from './coop-query-keys';

/*
 * Reusable, type-safe query option factories for the admin document
 * endpoints - same pattern as coop-admin.queries.ts /
 * coop-profile.queries.ts. Components fetch via
 * queryClient.ensureQueryData(...factory(this.documentService))
 * or injectQuery(() => ...factory(...)) rather than issuing/caching
 * HTTP calls themselves.
 */

// Document type definitions are static reference data - same
// treatment as LOCATIONS_STALE_TIME_MS in coop-profile.queries.ts:
// safe to keep cached for the entire browser session.
const DOCUMENT_TYPES_STALE_TIME_MS = Infinity;

// A cooperative's submitted documents can be changed by the
// cooperative (or another admin) while this admin is browsing, so
// this is kept only as fresh as the rest of the admin data - matches
// ADMIN_STALE_TIME_MS in coop-admin.queries.ts.
const ADMIN_DOCUMENTS_STALE_TIME_MS = 30_000;

// Each uploaded document's file content is immutable - replacing a
// document produces a new document record (new id/viewUrl), it never
// mutates in place. Safe to cache the fetched Blob for the whole
// browser session, same as DOCUMENT_TYPES_STALE_TIME_MS above.
const DOCUMENT_THUMBNAIL_STALE_TIME_MS = Infinity;

export function documentTypesQueryOptions(documentService: CoopDocumentService) {
  return queryOptions({
    queryKey: coopQueryKeys.documentTypes(),
    queryFn: () => firstValueFrom(documentService.getDocumentTypes()),
    staleTime: DOCUMENT_TYPES_STALE_TIME_MS,
    gcTime: DOCUMENT_TYPES_STALE_TIME_MS
  });
}

export function adminDocumentsQueryOptions(documentService: CoopDocumentService, appUserId: number) {
  return queryOptions({
    queryKey: coopQueryKeys.admin.documents(appUserId),
    queryFn: () => firstValueFrom(documentService.getAdminDocuments(appUserId)),
    staleTime: ADMIN_DOCUMENTS_STALE_TIME_MS,
    enabled: Number.isFinite(appUserId) && appUserId > 0
  });
}

/*
 * Caches the raw file (Blob) behind an uploaded document's viewUrl -
 * this is what backs the admin documents grid's image thumbnails.
 * Keyed by the document's own id, so once fetched, revisiting the
 * page (even after this component has been destroyed and recreated
 * by routing) reuses the cached Blob instead of re-issuing the same
 * GET request.
 */
export function documentThumbnailQueryOptions(
  documentService: CoopDocumentService,
  documentId: number,
  viewUrl: string
) {
  return queryOptions({
    queryKey: coopQueryKeys.admin.documentThumbnail(documentId),
    queryFn: () => firstValueFrom(documentService.getDocumentFile(viewUrl)),
    staleTime: DOCUMENT_THUMBNAIL_STALE_TIME_MS,
    gcTime: DOCUMENT_THUMBNAIL_STALE_TIME_MS
  });
}
