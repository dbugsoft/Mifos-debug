/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface CoopProfile {
  coopRegdNo: string;
  nameNp: string;
  nameEn: string;
  dateOfRegistered: string;
  panNo: string;
  provinceId: number | null;
  districtId: number | null;
  localLevelId: number | null;
  wardNo: number | null;
  tole: string;
  houseNo: string;
  mobilePhone: string;
  officePhone: string;
  logoUrl: string;
  status?: string;
  about: string;
  remarks: string;
}

export interface CoopLocation {
  id: number;
  combinedCode: string;

  provinceCode: string;
  provinceNameEn: string;
  provinceNameNp: string;

  districtCode: string;
  districtNameEn: string;
  districtNameNp: string;

  localLevelCode: string;
  localLevelNameEn: string;
  localLevelNameNp: string;

  ecologicalBelt: string;
  totalWard: number;
  isActive: boolean;
}
export interface CoopMe {
  emailVerified: boolean;
  phone: string;
  userId: number;
  status: string;
  email: string;
  role: string;
}

/**
 * Plain HTTP access for Coop profile/me/locations data.
 *
 * This service intentionally does NOT cache anything - server-state
 * caching (in-memory storage, staleness, invalidation) is owned
 * entirely by TanStack Query, wired up in ../queries/coop-profile.queries.ts
 * and consumed via injectQuery()/injectMutation() in the components.
 */
@Injectable({
  providedIn: 'root'
})
export class CoopProfileService {
  private http = inject(HttpClient);

  private readonly profileUrl = `${environment.coopApiUrl}/nepal/coop-registration/public/profile`;

  private readonly locationsUrl = `${environment.coopApiUrl}/nepal/coop-registration/public/locations`;

  private readonly meUrl = `${environment.coopApiUrl}/nepal/coop-registration/public/me`;

  // =====================================================
  // PROFILE
  // =====================================================

  createProfile(profile: CoopProfile): Observable<CoopProfile> {
    return this.http.post<CoopProfile>(this.profileUrl, profile);
  }

  getProfile(): Observable<CoopProfile> {
    return this.http.get<CoopProfile>(this.profileUrl);
  }

  updateProfile(profile: Partial<CoopProfile>): Observable<CoopProfile> {
    return this.http.patch<CoopProfile>(this.profileUrl, profile);
  }

  getMe(): Observable<CoopMe> {
    return this.http.get<CoopMe>(this.meUrl);
  }

  // =====================================================
  // LOCATIONS
  // =====================================================

  getLocations(): Observable<CoopLocation[]> {
    return this.http.get<CoopLocation[]>(this.locationsUrl);
  }
}
