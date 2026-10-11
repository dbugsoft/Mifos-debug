/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { ThemingService } from './theming.service';

describe('ThemingService', () => {
  beforeEach(() => {
    document.body.className = '';
    TestBed.configureTestingModule({});
  });

  it('starts light even when the OS prefers dark', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true, addEventListener: jest.fn() });
    expect(TestBed.inject(ThemingService).isDark).toBe(false);
    expect(document.body.classList).toContain('light-theme');
  });

  it('switches to dark without remembering it', () => {
    TestBed.inject(ThemingService).setDarkMode(true);
    expect(document.body.classList).toContain('dark-theme');
    expect(localStorage.setItem).not.toHaveBeenCalledWith(expect.stringMatching(/theme/i), expect.anything());
  });

  it('prints in light and restores dark afterwards', () => {
    TestBed.inject(ThemingService).setDarkMode(true);
    window.dispatchEvent(new Event('beforeprint'));
    expect(document.body.classList).not.toContain('dark-theme');
    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList).toContain('dark-theme');
  });
});
