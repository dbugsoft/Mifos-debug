/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** rxjs Imports */
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Custom Services */
import { ProgressBarService } from '../progress-bar/progress-bar.service';
import { MatSidenavContainer, MatSidenav, MatSidenavContent } from '@angular/material/sidenav';
import { NgClass, AsyncPipe } from '@angular/common';
import { SidenavComponent } from './sidenav/sidenav.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { ContentComponent } from './content/content.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Shell component.
 */
@Component({
  selector: 'mifosx-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatSidenavContainer,
    MatSidenav,
    NgClass,
    SidenavComponent,
    MatSidenavContent,
    ToolbarComponent,
    BreadcrumbComponent,
    ContentComponent,
    FooterComponent,
    AsyncPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent implements OnInit, AfterViewInit {
  private breakpointObserver = inject(BreakpointObserver);
  private progressBarService = inject(ProgressBarService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  /** Subscription to breakpoint observer for handset. */
  isHandset$: Observable<boolean> = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(map((result) => result.matches));
  /** Sets the initial state of sidenav as collapsed. Not collapsed if false. */
  sidenavCollapsed = true;
  /** Progress bar mode. */
  progressBarMode: string;
  /** Page area beside the sidenav: toolbar, breadcrumb and content. */
  @ViewChild(MatSidenavContent, { read: ElementRef }) private pageArea: ElementRef<HTMLElement>;

  /**
   * Subscribes to progress bar to update its mode.
   */
  ngOnInit() {
    this.progressBarService.updateProgressBar.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((mode: string) => {
      this.progressBarMode = mode;
      this.cdr.detectChanges();
    });
  }

  /**
   * Keeps the page's left edge under the first toolbar menu label as the layout changes
   * (window resize, sidenav opened / collapsed).
   */
  ngAfterViewInit() {
    const resizeObserver = new ResizeObserver(() => this.alignPageToToolbar());
    resizeObserver.observe(this.pageArea.nativeElement);
    this.destroyRef.onDestroy(() => resizeObserver.disconnect());
  }

  /**
   * Shifts breadcrumb and content (via --page-shift) so the shared content edge, a centred
   * box 90% wide and at most 84rem, starts where the first toolbar label's text starts.
   * Desktop only: on narrow screens the label sits too far in to follow.
   */
  private alignPageToToolbar() {
    const area = this.pageArea.nativeElement;
    const width = area.clientWidth;
    const label = area.querySelector('#mifosx-toolbar .tab-link');
    const text = label && Array.from(label.childNodes).find((node) => node.textContent?.trim());
    let shift = 0;

    if (text && width >= 960) {
      const start = text.textContent.search(/\S/);
      const range = document.createRange();
      range.setStart(text, start);
      range.setEnd(text, start + 1);
      const target = range.getBoundingClientRect().left - area.getBoundingClientRect().left;
      const maxContent = 84 * parseFloat(getComputedStyle(document.documentElement).fontSize);

      // Edge = shift + 5% of the remaining width, or centred when the 84rem cap applies.
      shift = (target - 0.05 * width) / 0.95;
      if (0.9 * (width - shift) > maxContent) {
        shift = 2 * target - width + maxContent;
      }
    }
    area.style.setProperty('--page-shift', `${Math.round(shift)}px`);
  }

  /**
   * Toggles the current collapsed state of sidenav according to the emitted event.
   * @param {boolean} event denotes state of sidenav
   */
  toggleCollapse($event: boolean) {
    this.sidenavCollapsed = $event;
    this.cdr.detectChanges();
  }
}
