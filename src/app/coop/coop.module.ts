/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';

import { CoopRoutingModule } from './coop-routing.module';

/*
 * Server-state cache for the whole Coop module.
 *
 * Created once and provided on this lazily-loaded module's injector,
 * which Angular keeps alive for the app's lifetime after the first
 * /coop navigation - so the cache persists across Coop route changes
 * exactly like a root-provided QueryClient would, without pulling
 * TanStack Query into the rest of the (non-Coop) application.
 *
 * retry/refetchOnWindowFocus are disabled to match this module's
 * pre-migration behaviour, where no request was ever automatically
 * retried or re-triggered by a window focus event. Per-query
 * staleTime is set where each query is defined, under ./queries.
 */
const coopQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000
    }
  }
});

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    CoopRoutingModule
  ],
  providers: [provideTanStackQuery(coopQueryClient)]
})
export class CoopModule {}
