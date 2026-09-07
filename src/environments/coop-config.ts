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
  }
};

const defaultCoopKey = '2079saji0009';

const domainMap: Record<string, string> = {
  // Custom domains can be added here eg 'sajilo.example.com': '2079saji0009'
};

function detectCoop(): string {
  const hostname = window.location.hostname;

  // 1. Check exact/custom domain first
  if (domainMap[hostname]) {
    return domainMap[hostname];
  }

  // 2. Get tenant ID from subdomain
  const subdomain = hostname.split('.')[0];

  // 3. If subdomain matches a configured tenant, use it
  if (coopConfigurations[subdomain]) {
    return subdomain;
  }

  // 4. Plain localhost / unknown domain -> default cooperative
  return defaultCoopKey;
}

let currentCoopConfig: CoopConfig | null = null;

export function getCoopConfig(): CoopConfig {
  if (!currentCoopConfig) {
    const coopKey = detectCoop();

    currentCoopConfig = coopConfigurations[coopKey] ?? coopConfigurations[defaultCoopKey];
  }

  return currentCoopConfig;
}
