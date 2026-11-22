/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
  ViewChild,
  inject
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

/** Custom Services */
import { PopoverService } from '../../../configuration-wizard/popover/popover.service';
import { ConfigurationWizardService } from '../../../configuration-wizard/configuration-wizard.service';

/** Custom Imports */
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { NavModule, NavPage, modulePermission, navSections } from './nav-items';
import { placeOf } from 'app/compliance/compliance-places';
import { ComplianceService } from 'app/compliance/compliance.service';

/**
 * Sidenav component: brand, Home and the module menus. Expanded, a module's pages open in
 * place; collapsed, only icons show and a module's pages open in a menu beside it.
 */
@Component({
  selector: 'mifosx-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    NgTemplateOutlet,
    RouterLinkActive,
    MatIcon,
    MatTooltip,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidenavComponent implements AfterViewInit {
  private router = inject(Router);
  configurationWizardService = inject(ConfigurationWizardService);
  private popoverService = inject(PopoverService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);
  readonly compliance = inject(ComplianceService);

  /** True if sidenav is in collapsed state. */
  @Input() sidenavCollapsed: boolean;
  /** Shown as an overlay (phones, small tablets): it covers the toolbar's toggle, so it needs its own close. */
  @Input() overlay = false;
  /** Emits when a link is followed, so the handset drawer can close. */
  @Output() navigate = new EventEmitter<void>();

  readonly sections = navSections;
  readonly modulePermission = modulePermission;
  /** The compliance place of the current page, for the Compliance group's highlight. */
  readonly place = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => placeOf((event as NavigationEnd).urlAfterRedirects))
    ),
    { initialValue: placeOf(this.router.url) }
  );

  /** A module's pages; the Compliance group's only where a compliance permission is held by name. */
  pagesOf(item: NavModule): NavPage[] {
    const pages = item.children ?? [];
    return item.compliance ? pages.filter((page) => this.compliance.can(...[page.permission ?? []].flat())) : pages;
  }

  /** The count beside a compliance place: what waits there; red when something is late, amber when due soon. */
  countOf(page: NavPage): { count: number; tone: 'bad' | 'warn' | '' } | null {
    const today = this.compliance.todayAnswer();
    if (!page.compliancePlace || !today) {
      return null;
    }
    if (page.compliancePlace === 'TODAY') {
      const count = today.late.total + today.soon.total;
      return count ? { count, tone: today.late.total ? 'bad' : 'warn' } : null;
    }
    const t = today.places[page.compliancePlace];
    return t?.waiting ? { count: t.waiting, tone: t.late ? 'bad' : t.soon ? 'warn' : '' } : null;
  }

  /** Labels of the open modules; opening one closes the others. */
  openModules = new Set<string>();

  /* Reference of the brand */
  @ViewChild('logo') logo: ElementRef<any>;
  /* Template for popover on the brand */
  @ViewChild('templateLogo') templateLogo: TemplateRef<any>;

  /** Opens or closes a module's pages. */
  toggle(item: NavModule) {
    const wasOpen = this.openModules.has(item.label);
    this.openModules.clear();
    if (!wasOpen) {
      this.openModules.add(item.label);
    }
  }

  /**
   * Scrolls the current page's link into view, once its module has opened and the list has rendered.
   * Called on load, after each navigation, and by the shell when the overlay sidebar opens.
   */
  revealActive() {
    setTimeout(() =>
      this.host.nativeElement
        .querySelector('.page.active, a.row.active, .module.active > .row')
        ?.scrollIntoView({ block: 'nearest' })
    );
  }

  /** Opens the module holding the current page, as its pages become active. */
  onActiveChange(item: NavModule, active: boolean) {
    if (active) {
      this.openModules.clear();
      this.openModules.add(item.label);
    }
  }

  /**
   * To show the configuration wizard popover.
   */
  ngAfterViewInit() {
    // asked afresh at each sign-in: the shell, and with it this sidebar, is created after signing in
    this.compliance
      .loadAccess(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((access) => access.showMenu && this.refreshCounts());
    this.revealActive();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.revealActive();
        // the counts follow the officer's work: asked again on each compliance page
        if (this.compliance.access().showMenu && placeOf((event as NavigationEnd).urlAfterRedirects)) {
          this.refreshCounts();
        }
      });
    if (this.configurationWizardService.showSideNav && this.logo) {
      setTimeout(() => this.popoverService.open(this.templateLogo, this.logo.nativeElement, 'bottom', true, {}), 200);
    }
  }

  private refreshCounts() {
    this.compliance.loadToday().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /**
   * Next Step (Breadcrumbs) Configuration Wizard.
   */
  nextStep() {
    this.configurationWizardService.showSideNav = false;
    this.configurationWizardService.showBreadcrumbs = true;
    this.reloadHome();
  }

  /**
   * Previous Step (Toolbar) Configuration Wizard.
   */
  previousStep() {
    this.configurationWizardService.showSideNav = false;
    this.configurationWizardService.showToolbarAdmin = true;
    this.reloadHome();
  }

  private reloadHome() {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['/home']);
  }
}
