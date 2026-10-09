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
import { CardMenuComponent, MenuCard } from './card-menu/card-menu.component';

/** Cards for the Member Management landing page. */
const memberManagementCards: MenuCard[] = [
  { label: 'labels.menus.Clients', icon: 'users', path: ['/members'], permission: 'READ_CLIENT' },
  { label: 'labels.menus.Groups', icon: 'sitemap', path: ['/groups'], permission: 'READ_GROUP' },
  { label: 'labels.menus.Centers', icon: 'building', path: ['/centers'], permission: 'READ_CENTER' },
  {
    label: 'membership.Membership Applications',
    icon: 'user-check',
    path: [
      '/members',
      'applications'
    ],
    permission: 'READ_MEMBERSHIP'
  }
];

/** Cards for the Reports landing page. */
const reportsCards: MenuCard[] = [
  { label: 'labels.menus.All', icon: 'list-ul', path: ['/reports'], permission: 'READ_REPORT' },
  { label: 'labels.menus.Clients', icon: 'users', path: [
      '/reports',
      'Client'
    ], permission: 'READ_REPORT' },
  { label: 'labels.menus.Loans', icon: 'hand-holding-usd', path: [
      '/reports',
      'Loan'
    ], permission: 'READ_REPORT' },
  { label: 'labels.menus.Savings', icon: 'money-bill-wave', path: [
      '/reports',
      'Savings'
    ], permission: 'READ_REPORT' },
  { label: 'labels.menus.Funds', icon: 'money-bill', path: [
      '/reports',
      'Fund'
    ], permission: 'READ_REPORT' },
  {
    label: 'labels.menus.Accounting',
    icon: 'money-bill-alt',
    path: [
      '/reports',
      'Accounting'
    ],
    permission: 'READ_REPORT'
  },
  { label: 'labels.menus.Loan Aging', icon: 'clock', path: ['/loan-aging'], permission: 'READ_LOAN' }
];

/** Cards for the Admin landing page. */
const adminCards: MenuCard[] = [
  { label: 'labels.menus.Users', icon: 'users', path: ['/appusers'], permission: 'READ_USER' },
  { label: 'labels.menus.Organization', icon: 'building', path: ['/organization'], permission: 'READ_OFFICE' },
  { label: 'labels.menus.System', icon: 'cogs', path: ['/system'], permission: 'READ_CONFIGURATION' },
  { label: 'labels.menus.Products', icon: 'tags', path: ['/products'], permission: 'READ_PRODUCT' },
  { label: 'labels.menus.Templates', icon: 'file-alt', path: ['/templates'], permission: 'READ_TEMPLATE' }
];

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
