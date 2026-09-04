/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CoopMeComponent } from './coop-me/coop-me.component';
import { CoopLoginComponent } from './auth/coop-login/coop-login.component';
import { CoopRegistrationComponent } from './registration/coop-registration/coop-registration.component';
import { CoopVerifyEmailComponent } from './auth/coop-verify-email/coop-verify-email.component';
import { CoopProfileComponent } from './profile/coop-profile/coop-profile.component';
import { CoopAdminDashboardComponent } from './admin/coop-admin-dashboard/coop-admin-dashboard.component';
import { CoopAdminDetailComponent } from './admin/coop-admin-detail/coop-admin-detail.component';
import { coopAdminGuard } from './auth/guards/coop-admin.guard';

const routes: Routes = [
  {
    path: 'login',
    component: CoopLoginComponent
  },
  {
    path: 'register',
    component: CoopRegistrationComponent
  },
  {
    path: 'verify-email',
    component: CoopVerifyEmailComponent
  },
  {
    path: 'profile',
    component: CoopProfileComponent
  },
  {
    path: 'me',
    component: CoopMeComponent
  },
  {
    path: 'admin',
    canActivate: [coopAdminGuard],
    children: [
      {
        path: '',
        component: CoopAdminDashboardComponent
      },
      {
        path: ':id',
        component: CoopAdminDetailComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CoopRoutingModule {}
