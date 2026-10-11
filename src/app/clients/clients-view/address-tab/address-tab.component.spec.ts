/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { describe, it, expect, jest } from '@jest/globals';

import { AddressTabComponent } from './address-tab.component';
import { ClientsService } from 'app/clients/clients.service';
import { PostalCodeLookupService } from 'app/shared/services/postal-code-lookup.service';

describe('AddressTabComponent', () => {
  it('saves to the member in the address after Back/Forward reuses the tab', () => {
    const parentParams = new BehaviorSubject(convertToParamMap({ clientId: '5' }));
    const clientsService = { editClientAddress: jest.fn(() => of({})) };

    TestBed.configureTestingModule({
      imports: [
        AddressTabComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { parent: { paramMap: parentParams }, data: of({ clientAddressData: [] }) }
        },
        { provide: ClientsService, useValue: clientsService },
        { provide: PostalCodeLookupService, useValue: {} }
      ]
    });
    const component = TestBed.createComponent(AddressTabComponent).componentInstance;

    // Angular reuses the tab component when only the member id in the address changes.
    parentParams.next(convertToParamMap({ clientId: '2' }));
    component.toggleAddress({ addressId: 1, addressTypeId: 3, isActive: true });

    expect(clientsService.editClientAddress).toHaveBeenCalledWith('2', 3, { addressId: 1, isActive: false });
  });
});
