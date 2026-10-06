/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { MembershipService } from './membership.service';
import { MembershipApplication, MembershipTemplate } from './membership.models';

/** The membership template, or null when this user may not read memberships (then everything works as before). */
@Injectable()
export class MembershipTemplateResolver {
  private membershipService = inject(MembershipService);

  resolve(): Observable<MembershipTemplate | null> {
    return this.membershipService.templateOrNull();
  }
}

/** The member's membership application, or null. */
@Injectable()
export class ClientMembershipResolver {
  private membershipService = inject(MembershipService);

  resolve(route: ActivatedRouteSnapshot): Observable<MembershipApplication | null> {
    return this.membershipService.forClient(route.paramMap.get('clientId'));
  }
}
