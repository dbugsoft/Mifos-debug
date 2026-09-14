/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface CoopConfig {
  tenantId: string;
  coopName: string;
}

/*
 * Cooperative hostname -> tenant mapping.
 *
 * ONBOARDING RULE: a cooperative's host must be added here (a subdomain key
 * below, or a custom domain in domainMap) and deployed BEFORE a registry admin
 * activates the cooperative. The admin confirms this in the activation dialog;
 * the backend cannot check it. A host missing from this file silently uses the
 * "default" tenant (see resolveCoop), which gives the cooperative a confusing
 * "invalid credentials" error on the wrong tenant. Deployments can block that
 * with window.env.blockUnmappedHosts (see src/app/unconfigured-host).
 */
const coopConfigurations: Record<string, CoopConfig> = {
  '2075ruru0008': {
    tenantId: '2075ruru0008',
    coopName: 'Ruru Multipurpose Cooperative Limited'
  },
  '2079saji0009': {
    tenantId: '2079saji0009',
    coopName: 'Sajilo Savings and Credit Cooperative Ltd.'
  },

  '2078aara0011': {
    tenantId: '2078aara0011',
    coopName: 'Aarambha Multipurpose Cooperative Ltd.'
  },

  '2077aara0010': {
    tenantId: '2077aara0010',
    coopName: 'Udaya Savings and Credit Cooperative Ltd.'
  },

  '2081bini0002': {
    tenantId: '2081bini0002',
    coopName: 'Binita Cooperative Test Ltd.'
  },
  '2001nepa0001': {
    tenantId: '2001nepa0001',
    coopName: 'Nepal Cooperative Limited'
  },
  '2078sunr0003': {
    tenantId: '2078sunr0003',
    coopName: 'Sunrise Community Savings and Credit Cooperative Ltd.'
  },
  // Tenant-neutral entry for local development and any host that maps to no cooperative.
  // Without it an unrecognised host silently inherits a real cooperative's tenant.
  default: {
    tenantId: 'default',
    coopName: 'Mifos X'
  }
};

const defaultCoopKey = 'default';

const domainMap: Record<string, string> = {
  // Custom domains can be added here eg 'sajilo.example.com': '2079saji0009'
};

export interface CoopResolution {
  /** Key into the cooperative configurations. */
  key: string;
  /** False when the hostname mapped to no cooperative and fell back to the default tenant. */
  matched: boolean;
}

/** Maps a hostname to its cooperative: an exact custom domain first, then the subdomain. */
export function resolveCoop(hostname: string): CoopResolution {
  const host = (hostname ?? '').toLowerCase();

  // 1. Exact/custom domain
  if (domainMap[host]) {
    return { key: domainMap[host], matched: true };
  }

  // 2. Tenant ID from the subdomain
  const subdomain = host.split('.')[0];

  if (subdomain !== defaultCoopKey && coopConfigurations[subdomain]) {
    return { key: subdomain, matched: true };
  }

  // 3. Plain localhost / unknown domain -> default cooperative
  return { key: defaultCoopKey, matched: false };
}

let currentCoopConfig: CoopConfig | null = null;

export function getCoopConfig(): CoopConfig {
  if (!currentCoopConfig) {
    const coopKey = resolveCoop(window.location.hostname).key;

    currentCoopConfig = coopConfigurations[coopKey] ?? coopConfigurations[defaultCoopKey];
  }

  return currentCoopConfig;
}
