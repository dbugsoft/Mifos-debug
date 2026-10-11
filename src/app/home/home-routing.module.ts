/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/** Routing Imports */
import { Route } from '../core/route/route.service';

/** Custom Components */
import { HomeComponent } from './home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TaskListComponent } from 'app/coop-dashboard/task-list/task-list.component';
import { CardMenuComponent } from './card-menu/card-menu.component';
import { adminCards, memberManagementCards, reportsCards } from 'app/core/shell/sidenav/nav-items';

/** Custom Resolvers */
import { OfficesResolver } from '../accounting/common-resolvers/offices.resolver';

/** Home and Dashboard Routes */
const routes: Routes = [
  Route.withShell([
    {
      path: '',
      redirectTo: '/dashboard',
      pathMatch: 'full'
    },
    {
      path: 'home',
      component: HomeComponent,
      data: { title: 'Home' }
    },
    {
      path: 'member-management',
      component: CardMenuComponent,
      data: {
        title: 'Member Management',
        breadcrumb: 'Member Management',
        hideBreadcrumbTrail: true,
        cards: memberManagementCards
      }
    },
    {
      path: 'reports-overview',
      component: CardMenuComponent,
      data: {
        title: 'Reports',
        breadcrumb: 'Reports',
        hideBreadcrumbTrail: true,
        cards: reportsCards
      }
    },
    {
      path: 'administration',
      component: CardMenuComponent,
      data: {
        title: 'Admin',
        breadcrumb: 'Admin',
        hideBreadcrumbTrail: true,
        cards: adminCards
      }
    },
    {
      path: 'dashboard',
      data: { title: 'Dashboard', breadcrumb: 'Dashboard' },
      children: [
        {
          path: '',
          component: DashboardComponent,
          resolve: {
            offices: OfficesResolver
          }
        },
        {
          // Every record of one "needs attention" task (fineract-dbug ADR 0021)
          path: 'tasks/:code',
          component: TaskListComponent,
          data: { title: 'Needs attention', breadcrumb: 'Needs attention' }
        }
      ]
    }
  ])
];

/**
 * Home Routing Module
 *
 * Configures the home and dashboard routes.
 */
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [OfficesResolver]
})
export class HomeRoutingModule {}
