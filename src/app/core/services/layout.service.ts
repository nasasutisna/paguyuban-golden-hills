import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

/**
 * Coarse device classification based on viewport width.
 * Breakpoints are aligned with the table component's media queries
 * so that `isMobile` matches the point where the table header stacks
 * its actions vertically.
 */
export type LayoutMode = 'mobile' | 'tablet' | 'desktop';

export interface LayoutState {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Coarse device classification. */
  mode: LayoutMode;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Layout / responsive service.
 *
 * Tracks the browser viewport size and exposes a coarse classification
 * (`mobile` / `tablet` / `desktop`) plus convenience boolean streams.
 *
 * Components can use this when they need to change template structure or
 * component logic based on screen size. Purely visual adjustments should
 * still prefer CSS media queries; this service is for the cases CSS alone
 * cannot handle (conditional rendering, programmatic behaviour, etc.).
 */
@Injectable({
  providedIn: 'root'
})
export class LayoutService implements OnDestroy {
  /** Mobile when viewport width <= this value (matches table header stack breakpoint). */
  static readonly MOBILE_MAX_WIDTH = 768;
  /** Tablet when viewport width is between mobile and this value (inclusive). */
  static readonly TABLET_MAX_WIDTH = 1024;

  private readonly initialState: LayoutState = this.buildState(this.readWindowSize());

  private readonly stateSubject = new BehaviorSubject<LayoutState>(this.initialState);

  /** Full layout state stream (width, height, mode, flags). */
  readonly layout$: Observable<LayoutState> = this.stateSubject.asObservable();

  /** Emits the coarse device mode, only when it actually changes. */
  readonly mode$: Observable<LayoutMode> = this.layout$.pipe(
    map(s => s.mode),
    distinctUntilChanged()
  );

  /** Emits `true` while the viewport is in mobile range. */
  readonly isMobile$: Observable<boolean> = this.layout$.pipe(
    map(s => s.isMobile),
    distinctUntilChanged()
  );

  /** Emits `true` while the viewport is in tablet range. */
  readonly isTablet$: Observable<boolean> = this.layout$.pipe(
    map(s => s.isTablet),
    distinctUntilChanged()
  );

  /** Emits `true` while the viewport is in desktop range. */
  readonly isDesktop$: Observable<boolean> = this.layout$.pipe(
    map(s => s.isDesktop),
    distinctUntilChanged()
  );

  /** requestAnimationFrame id for the resize throttle, null when no pending frame. */
  private rafId: number | null = null;

  constructor() {
    if (this.isBrowser()) {
      // Bind once; passive since we never call preventDefault.
      window.addEventListener('resize', this.onResize, { passive: true });
    }
  }

  /** Current layout snapshot (synchronous). */
  get snapshot(): LayoutState {
    return this.stateSubject.value;
  }

  /** Synchronous check: is the viewport currently in mobile range? */
  get isMobile(): boolean {
    return this.stateSubject.value.isMobile;
  }

  /** Synchronous check: is the viewport currently in tablet range? */
  get isTablet(): boolean {
    return this.stateSubject.value.isTablet;
  }

  /** Synchronous check: is the viewport currently in desktop range? */
  get isDesktop(): boolean {
    return this.stateSubject.value.isDesktop;
  }

  /** Synchronous accessor for the coarse device mode. */
  get mode(): LayoutMode {
    return this.stateSubject.value.mode;
  }

  ngOnDestroy(): void {
    if (this.isBrowser()) {
      window.removeEventListener('resize', this.onResize);
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  /**
   * Resize handler, throttled via requestAnimationFrame so multiple
   * resize events within a single frame collapse into one state update.
   */
  private onResize = (): void => {
    if (!this.isBrowser() || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.stateSubject.next(this.buildState(this.readWindowSize()));
    });
  };

  private readWindowSize(): { width: number; height: number } {
    if (!this.isBrowser()) {
      return { width: 0, height: 0 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  private buildState(size: { width: number; height: number }): LayoutState {
    const { width } = size;
    const mode: LayoutMode =
      width <= LayoutService.MOBILE_MAX_WIDTH
        ? 'mobile'
        : width <= LayoutService.TABLET_MAX_WIDTH
          ? 'tablet'
          : 'desktop';

    return {
      width,
      height: size.height,
      mode,
      isMobile: mode === 'mobile',
      isTablet: mode === 'tablet',
      isDesktop: mode === 'desktop'
    };
  }

  /** Guard against non-browser environments (e.g. SSR / prerender). */
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }
}
