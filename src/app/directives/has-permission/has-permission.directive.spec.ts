/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthenticationService } from '../../core/authentication/authentication.service';
import { HasPermissionDirective } from './has-permission.directive';

@Component({
  imports: [HasPermissionDirective],
  template: `<span *mifosxHasPermission="permissions()">shown</span>`
})
class HostComponent {
  /** A fresh array on every check, as a method call in a template gives. */
  permissions() {
    return ['READ_CLIENT'];
  }
}

describe('HasPermissionDirective', () => {
  it('keeps the same view when the permission is unchanged', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions: ['READ_CLIENT'] }) } }
      ]
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const first = fixture.nativeElement.querySelector('span');

    fixture.detectChanges();

    expect(first).toBeTruthy();
    expect(fixture.nativeElement.querySelector('span')).toBe(first);
  });
});
