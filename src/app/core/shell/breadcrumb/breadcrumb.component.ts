/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  TemplateRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, NavigationEnd, Data } from '@angular/router';

/** rxjs Imports */
import { filter } from 'rxjs/operators';
import { merge } from 'rxjs';

/** Custom Model */
import { Breadcrumb } from './breadcrumb.model';

/** Custom Services */
import { PopoverService } from '../../../configuration-wizard/popover/popover.service';
import { ConfigurationWizardService } from '../../../configuration-wizard/configuration-wizard.service';
import { TranslateService } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { formatTabLabel } from 'app/shared/utils/format-tab-label.util';
import { normalizeBreadcrumbUrl } from 'app/shared/utils/breadcrumb-url.util';

/**
 * Route data property to generate breadcrumb using a static string.
 *
 * Example- breadcrumb: 'Home'
 */
const routeDataBreadcrumb = 'breadcrumb';
/**
 * Route data property to generate breadcrumb using given route parameter name.
 *
 * Example- routeParamBreadcrumb: 'id'
 */
const routeParamBreadcrumb = 'routeParamBreadcrumb';
/**
 * Route data property to generate breadcrumb using resolved data property name.
 *
 * Use array to specify name for a nested object property.
 *
 * Example- routeResolveBreadcrumb: ['user', 'username']
 */
const routeResolveBreadcrumb = 'routeResolveBreadcrumb';
/**
 * Route data property to specify whether generated breadcrumb should have a link.
 *
 * True by default. Specify false if a link is not required.
 *
 * Example- addBreadcrumbLink: false
 */
const routeAddBreadcrumbLink = 'addBreadcrumbLink';
/**
 * Route data property to put a parent page crumb before this route's own, for sections whose
 * landing page lives in another module. Read from the route config only, so children do not inherit it.
 *
 * Example- parentBreadcrumb: { label: 'Member Management', url: '/member-management' }
 */
const routeParentBreadcrumb = 'parentBreadcrumb';
/**
 * Route data property to hide the breadcrumb trail (the `home › ...` line)
 * while still showing the page title. Useful for top-level landing pages.
 *
 * Example- hideBreadcrumbTrail: true
 */
const routeHideBreadcrumbTrail = 'hideBreadcrumbTrail';
/**
 * Route data property to hide the "Back to ..." link, for pages reached from the sidebar.
 *
 * Example- hideBackLink: true
 */
const routeHideBackLink = 'hideBackLink';
/**
 * Route data property: a function of the route's data giving the page heading, when the heading should differ
 * from the crumb (the crumb shows the id, the heading the name). Read from the route config only, so child
 * pages such as Edit keep their own heading.
 *
 * Example- pageTitle: (data) => `${data.user.firstname} ${data.user.lastname}`
 */
const routePageTitle = 'pageTitle';

/**
 * Generate breadcrumbs dynamically via route configuration.
 */
@Component({
  selector: 'mifosx-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreadcrumbComponent implements AfterViewInit {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private configurationWizardService = inject(ConfigurationWizardService);
  private popoverService = inject(PopoverService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  /** Array of breadcrumbs. */
  breadcrumbs: Breadcrumb[];
  /** Whether the breadcrumb trail (the `home › ...` line) should be hidden for the current route. */
  hideTrail = false;
  /** Link of the nearest navigable parent breadcrumb, used by the back button. */
  backUrl: string | null = null;
  /** Label of that parent breadcrumb, e.g. the member's name. */
  backLabel = '';
  /* Reference of breadcrumb */
  @ViewChild('breadcrumb') breadcrumb: ElementRef<any>;
  /* Template for popover on breadcrumb */
  @ViewChild('templateBreadcrumb') templateBreadcrumb: TemplateRef<any>;

  /**
   * Generates the breadcrumbs.
   * @param {ActivatedRoute} activatedRoute Activated Route.
   * @param {Router} router Router for navigation.
   * @param {ConfigurationWizardService} configurationWizardService ConfigurationWizard Service.
   * @param {PopoverService} popoverService PopoverService.
   */
  constructor() {
    this.generateBreadcrumbs();
  }

  /**
   * Generates the array of breadcrumbs for the visited route.
   */
  generateBreadcrumbs() {
    const onNavigationEnd = this.router.events.pipe(filter((event) => event instanceof NavigationEnd));

    // Merge navigation events with language change events to regenerate breadcrumbs when language changes
    merge(onNavigationEnd, this.translateService.onLangChange)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.breadcrumbs = [];
        let currentRoute = this.activatedRoute.root;
        let currentUrl = '';

        while (currentRoute.children.length > 0) {
          const childrenRoutes = currentRoute.children;
          let breadcrumbLabel: any;
          let url: any;

          childrenRoutes.forEach((route) => {
            currentRoute = route;
            breadcrumbLabel = false;
            let isClientCrumb = false;

            if (route.outlet !== 'primary') {
              return;
            }

            const routeURL = route.snapshot.url.map((segment) => segment.path).join('/');
            currentUrl += `/${routeURL}`;

            if (currentUrl === '/') {
              breadcrumbLabel = 'Home';
            }

            const hasData = route.routeConfig && route.routeConfig.data;

            if (hasData) {
              if (
                route.snapshot.data.hasOwnProperty(routeResolveBreadcrumb) &&
                route.snapshot.data[routeResolveBreadcrumb]
              ) {
                breadcrumbLabel = route.snapshot.data;
                route.snapshot.data[routeResolveBreadcrumb].forEach((property: any) => {
                  breadcrumbLabel = breadcrumbLabel[property];
                });
              } else if (
                route.snapshot.data.hasOwnProperty(routeParamBreadcrumb) &&
                route.snapshot.paramMap.get(route.snapshot.data[routeParamBreadcrumb])
              ) {
                breadcrumbLabel = route.snapshot.paramMap.get(route.snapshot.data[routeParamBreadcrumb]);
                if (route.snapshot.data[routeParamBreadcrumb] === 'datatableName' && breadcrumbLabel) {
                  breadcrumbLabel = formatTabLabel(breadcrumbLabel);
                }
                const routeData: Data = route.snapshot.data;
                if (routeData.breadcrumb === 'Clients') {
                  breadcrumbLabel = this.printableValue(routeData.clientViewData.displayName);
                  isClientCrumb = true;
                } else if (routeData.breadcrumb === 'Groups') {
                  breadcrumbLabel = routeData.groupViewData.name;
                } else if (routeData.breadcrumb === 'Centers') {
                  breadcrumbLabel = routeData.centerViewData.name;
                } else if (routeData.breadcrumb === 'Loans') {
                  breadcrumbLabel =
                    this.printableValue(routeData.loanDetailsData.loanProductName) +
                    ' (' +
                    routeData.loanDetailsData.accountNo +
                    ')';
                } else if (routeData.breadcrumb === 'Savings') {
                  const savingsProductName = routeData.savingsAccountData?.savingsProductName ?? '';
                  const accountNo = routeData.savingsAccountData?.accountNo ?? '';
                  breadcrumbLabel = this.printableValue(savingsProductName) + (accountNo ? ' (' + accountNo + ')' : '');
                } else if (routeData.breadcrumb === 'Fixed Deposits') {
                  breadcrumbLabel =
                    this.printableValue(routeData.fixedDepositsAccountData.depositProductName) +
                    ' (' +
                    routeData.fixedDepositsAccountData.accountNo +
                    ')';
                } else if (routeData.breadcrumb === 'Loan Products') {
                  breadcrumbLabel = this.printableValue(routeData.loanProduct.name);
                } else if (routeData.breadcrumb === 'Charges') {
                  breadcrumbLabel = routeData.loansAccountCharge.name;
                } else if (routeData.breadcrumb === 'Saving Products') {
                  breadcrumbLabel = routeData.savingProduct.name;
                } else if (routeData.breadcrumb === 'Share Products') {
                  breadcrumbLabel = routeData.shareProduct.name;
                } else if (routeData.breadcrumb === 'Fixed Deposit Products') {
                  breadcrumbLabel = routeData.fixedDepositProduct.name;
                } else if (routeData.breadcrumb === 'Recurring Deposit Products') {
                  breadcrumbLabel = routeData.recurringDepositProduct.name;
                } else if (routeData.breadcrumb === 'Floating Rates') {
                  breadcrumbLabel = routeData.floatingRate.name;
                } else if (routeData.breadcrumb === 'Tax Components') {
                  breadcrumbLabel = routeData.taxComponent.name;
                } else if (routeData.breadcrumb === 'Tax Groups') {
                  breadcrumbLabel = routeData.taxGroup.name;
                }

                // For action names, keep the original name and let getTranslate() handle translation dynamically
                // This ensures breadcrumbs update when language changes without requiring navigation
                // The getTranslate() method will check both labels.text.* and labels.menus.* for translations
              } else if (route.snapshot.data.hasOwnProperty(routeDataBreadcrumb)) {
                breadcrumbLabel = route.snapshot.data[routeDataBreadcrumb];
              }

              if (route.snapshot.data.hasOwnProperty(routeAddBreadcrumbLink)) {
                url = route.snapshot.data[routeAddBreadcrumbLink];
              } else {
                url = currentUrl;
              }

              // For module root breadcrumbs (e.g. "Loans", "Savings") whose URL has no entity child,
              // extract the correct URL from the full router URL to build a navigable link.
              if (url && typeof url === 'string') {
                const accountPathMatch = url
                  .replace(/\/+/g, '/')
                  .match(/\/(loans-accounts|savings-accounts|shares-accounts)\/$/);
                if (accountPathMatch) {
                  const fullUrl = this.router.url.replace(/\/+/g, '/');
                  const entityUrlMatch = fullUrl.match(new RegExp(`(.*/${accountPathMatch[1]}/\\d+)`));
                  if (entityUrlMatch) {
                    url = entityUrlMatch[1];
                  } else {
                    url = false;
                  }
                }
              }
            }
            if (typeof url === 'string' && url) {
              url = normalizeBreadcrumbUrl(url, isClientCrumb);
            }

            const breadcrumb: Breadcrumb = {
              label: breadcrumbLabel,
              url: url,
              // The view may sit on the route itself (members) or on its empty-path child (groups, centers).
              hostsPage: [
                route,
                route.firstChild?.routeConfig?.path === '' ? route.firstChild : null
              ].some((hosting) => !!(hosting?.routeConfig?.component || hosting?.routeConfig?.loadComponent))
            };

            const pageTitle = route.routeConfig?.data?.[routePageTitle];
            if (typeof pageTitle === 'function') {
              breadcrumb.title = pageTitle(route.snapshot.data);
            }

            const parentBreadcrumb: Breadcrumb | undefined = route.routeConfig?.data?.[routeParentBreadcrumb];
            if (parentBreadcrumb) {
              this.breadcrumbs.push(parentBreadcrumb);
            }

            if (breadcrumbLabel) {
              this.breadcrumbs.push(breadcrumb);
            }
          });
        }
        this.hideTrail = !!(currentRoute?.snapshot?.data && currentRoute.snapshot.data[routeHideBreadcrumbTrail]);
        this.setBackLink();
        if (currentRoute?.snapshot?.data?.[routeHideBackLink]) {
          this.backUrl = null;
        }
        this.cdr.markForCheck();
      });
  }

  /**
   * Link of the nearest parent breadcrumb that is navigable, or null on top level pages.
   */
  private setBackLink(): void {
    const currentUrl = this.router.url.split('?')[0];
    const parents = this.breadcrumbs
      .slice(0, -1)
      // Not the page itself: the same url, or a view that shows this page inside it (a tab). A sibling
      // page such as a member's Edit keeps the member as its parent.
      .filter((crumb) => typeof crumb.url === 'string' && crumb.url && crumb.url !== currentUrl && !crumb.hostsPage);
    const parent = parents.length ? parents[parents.length - 1] : null;
    this.backUrl = parent ? parent.url : null;
    this.backLabel = parent ? (parent.title ?? parent.label) : '';
  }

  printableValue(value: string): string {
    if (!value) {
      return '';
    }
    if (value.length <= 30) {
      return value;
    }
    return value.substring(0, 30) + '...';
  }

  /**
   * Popover function
   * @param template TemplateRef<any>.
   * @param target HTMLElement | ElementRef<any>.
   * @param position String.
   * @param backdrop Boolean.
   */
  showPopover(
    template: TemplateRef<any>,
    target: HTMLElement | ElementRef<any>,
    position: string,
    backdrop: boolean
  ): void {
    setTimeout(() => this.popoverService.open(template, target, position, backdrop, {}), 200);
  }

  /**
   * To show popover.
   */
  ngAfterViewInit() {
    if (this.configurationWizardService.showBreadcrumbs) {
      setTimeout(() => {
        this.showPopover(this.templateBreadcrumb, this.breadcrumb.nativeElement, 'bottom', true);
      });
    }
  }

  /**
   * Next Step (Home) Configuration Wizard.
   */
  nextStep() {
    this.configurationWizardService.showBreadcrumbs = false;
    this.configurationWizardService.showHome = true;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['/home']);
  }

  /**
   * Previous Step (SideNavBar) Configuration Wizard.
   */
  previousStep() {
    this.configurationWizardService.showBreadcrumbs = false;
    this.configurationWizardService.showSideNavChartofAccounts = true;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['/home']);
  }

  getTranslate(text: string): any {
    // First try labels.text.* (for static breadcrumb labels)
    let key: string = 'labels.text.' + text;
    let translation = this.translateService.instant(key);
    if (translation !== key) {
      return translation;
    }

    // Then try labels.menus.* (for action names like "View Guarantors")
    key = 'labels.menus.' + text;
    translation = this.translateService.instant(key);
    if (translation !== key) {
      return translation;
    }

    // If no translation found, return the original text
    return text;
  }
}
