/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { firstValueFrom } from 'rxjs';

import { MemberAddressService } from './member-address.service';
import { NepalLocationService } from './nepal-location.service';
import { MOCK_LOCATIONS } from './testing/nepal-locations.mock';

describe('MemberAddressService', () => {
  let service: MemberAddressService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(MemberAddressService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads, creates, replaces and removes addresses by type', () => {
    service.getAddresses(16).subscribe();
    http.expectOne({ method: 'GET', url: '/v1/clients/16/nepal-addresses' }).flush([]);

    service.getTemplate(16).subscribe();
    http.expectOne({ method: 'GET', url: '/v1/clients/16/nepal-addresses/template' }).flush({});

    service.create(16, 'PERMANENT', { localLevelCode: '32701', wardNo: 3 }).subscribe();
    const created = http.expectOne({ method: 'POST', url: '/v1/clients/16/nepal-addresses' });
    expect(created.request.body).toEqual({ addressType: 'PERMANENT', localLevelCode: '32701', wardNo: 3 });
    created.flush({ resourceId: 7 });

    service.update(16, 'TEMPORARY', { sameAsPermanent: true }).subscribe();
    const updated = http.expectOne({ method: 'PUT', url: '/v1/clients/16/nepal-addresses/TEMPORARY' });
    expect(updated.request.body).toEqual({ sameAsPermanent: true });
    updated.flush({});

    service.delete(16, 'TEMPORARY').subscribe();
    http.expectOne({ method: 'DELETE', url: '/v1/clients/16/nepal-addresses/TEMPORARY' }).flush({});
  });

  it('saves the permanent address before a temporary address that follows it', async () => {
    const done = firstValueFrom(
      service.saveDraft(16, {
        permanent: { sameAsPermanent: false, localLevelCode: '32701', wardNo: 3 },
        temporary: { sameAsPermanent: true }
      })
    );

    const permanent = http.expectOne('/v1/clients/16/nepal-addresses');
    expect(permanent.request.body.addressType).toBe('PERMANENT');
    http.expectNone((request) => request.body?.addressType === 'TEMPORARY');
    permanent.flush({ resourceId: 7 });

    const temporary = http.expectOne('/v1/clients/16/nepal-addresses');
    expect(temporary.request.body).toEqual({ addressType: 'TEMPORARY', sameAsPermanent: true });
    temporary.flush({ resourceId: 8 });

    await expect(done).resolves.toEqual({ resourceId: 8 });
  });

  it('does not save a temporary address when the permanent one fails', async () => {
    const done = firstValueFrom(
      service.saveDraft(16, {
        permanent: { localLevelCode: '32701', wardNo: 3 },
        temporary: { sameAsPermanent: true }
      })
    );
    http.expectOne('/v1/clients/16/nepal-addresses').flush({}, { status: 400, statusText: 'Bad Request' });

    await expect(done).rejects.toBeTruthy();
    http.expectNone('/v1/clients/16/nepal-addresses');
  });

  it('saves only the permanent address when there is no temporary one', async () => {
    const done = firstValueFrom(
      service.saveDraft(16, { permanent: { localLevelCode: '32701', wardNo: 3 }, temporary: null })
    );
    http.expectOne('/v1/clients/16/nepal-addresses').flush({ resourceId: 7 });
    await expect(done).resolves.toEqual({ resourceId: 7 });
  });
});

describe('NepalLocationService', () => {
  let service: NepalLocationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    service = TestBed.inject(NepalLocationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('downloads the locations once and shares them, including inactive ones', async () => {
    const first = firstValueFrom(service.locations());
    const second = firstValueFrom(service.locations());
    http.expectOne({ method: 'GET', url: '/v1/nepal-locations' }).flush(MOCK_LOCATIONS);

    const [
      a,
      b
    ] = await Promise.all([
      first,
      second
    ]);
    expect(a).toBe(b);
    expect(a.find('32799')?.isActive).toBe(false);

    await firstValueFrom(service.locations());
    http.expectNone('/v1/nepal-locations');
  });

  it('tries again after a failed download', async () => {
    const failed = firstValueFrom(service.locations());
    http.expectOne('/v1/nepal-locations').flush(null, { status: 500, statusText: 'Server Error' });
    await expect(failed).rejects.toBeTruthy();

    const retried = firstValueFrom(service.locations());
    http.expectOne('/v1/nepal-locations').flush(MOCK_LOCATIONS);
    await expect(retried).resolves.toBeTruthy();
  });
});
