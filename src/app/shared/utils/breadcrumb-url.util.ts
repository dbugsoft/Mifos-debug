/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Normalizes a breadcrumb URL built by walking the route tree.
 *
 * Collapses the empty path segments that componentless routes contribute. A client crumb
 * points at the client's general tab, which is appended here rather than being pushed into
 * the accumulated URL, so that crumbs below the client stay routable.
 */
export function normalizeBreadcrumbUrl(url: string, isClientCrumb = false): string {
  const collapsed = url.replace(/\/+/g, '/');
  return isClientCrumb ? `${collapsed.replace(/\/$/, '')}/general` : collapsed;
}
