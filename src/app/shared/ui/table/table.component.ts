import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  TableConfig,
  TableColumn,
  TableAction,
  TableSort,
  TableFilter,
  TablePagination,
  TableDataSource,
  StatusBadge,
  CurrencyFormatOptions,
  DateFormatOptions
} from './table.model';
import { ADMIN_COLORS } from '../admin-theme.config';
import { LayoutService } from '../../../core/services/layout.service';

/**
 * Reusable Table Component
 * Features: sorting, filtering, pagination, responsive design
 */
@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent<T = any> implements OnInit, OnDestroy, OnChanges {
  private alertController = inject(AlertController);
  private layoutService = inject(LayoutService);

  // Inputs
  @Input() config: TableConfig = {
    columns: [],
    sortable: true,
    filterable: true,
    pagination: true,
    pageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
    showHeader: true,
    striped: true,
    hoverable: true,
    bordered: false,
    compact: false,
    emptyMessage: 'No data available',
    loadingMessage: 'Loading data...'
  };

  @Input() dataSource: TableDataSource<T> = {
    data: [],
    loading: false
  };

  @Input() currentPage?: number; // Allows parent to control current page for server-side pagination

  @Input() statusBadges?: StatusBadge[];
  @Input() currencyOptions?: CurrencyFormatOptions;
  @Input() dateOptions?: DateFormatOptions;

  // Outputs
  @Output() sortChange = new EventEmitter<TableSort>();
  @Output() filterChange = new EventEmitter<TableFilter[]>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() rowClick = new EventEmitter<T>();
  @Output() actionClick = new EventEmitter<{ action: TableAction; item: T }>();

  // Internal state
  displayedData: T[] = [];
  sortState: TableSort = { column: '', direction: null };
  filters: TableFilter[] = [];
  searchValue = '';
  pagination: TablePagination = {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  };

  // Responsive state (driven by LayoutService)
  isMobile = this.layoutService.isMobile;
  isDesktop = this.layoutService.isDesktop;
  layoutMode = this.layoutService.mode;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Default options
  private defaultCurrencyOptions: CurrencyFormatOptions = {
    currency: 'IDR',
    locale: 'id-ID',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  };

  private defaultDateOptions: DateFormatOptions = {
    format: 'MMM dd, yyyy',
    locale: 'en-US'
  };

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(value => {
        this.applySearch(value);
      });

    this.initializePagination();

    // Keep the responsive flags in sync with the viewport so the template
    // can react (e.g. table-actions mobile layout).
    this.layoutService.isMobile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => (this.isMobile = value));

    this.layoutService.isDesktop$
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => (this.isDesktop = value));

    this.layoutService.mode$
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => (this.layoutMode = value));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[TableComponent] ngOnChanges called', changes);

    // Sync pagination.page when currentPage input changes from parent
    if (changes['currentPage'] && this.currentPage !== undefined) {
      this.pagination.page = this.currentPage;
    }

    if (changes['dataSource']) {
      console.log('[TableComponent] dataSource changed:', this.dataSource);
      console.log('[TableComponent] dataSource.data:', this.dataSource.data);
      console.log('[TableComponent] dataSource.data length:', this.dataSource.data?.length);
      this.updateDisplayedData();
      this.updatePagination();
      console.log('[TableComponent] displayedData after update:', this.displayedData);
      console.log('[TableComponent] displayedData length:', this.displayedData.length);
    }
  }

  /**
   * Initialize pagination
   */
  private initializePagination(): void {
    this.pagination.pageSize = this.config.pageSize || 10;
  }

  /**
   * Update displayed data based on pagination
   * For server-side pagination, display all data as received (already paginated by server)
   */
  private updateDisplayedData(): void {
    console.log('[TableComponent] updateDisplayedData called');
    console.log('[TableComponent] dataSource.data:', this.dataSource.data);
    // Data is already paginated from server, display all received data
    this.displayedData = this.dataSource.data || [];
    console.log('[TableComponent] displayedData set to:', this.displayedData);
  }

  /**
   * Update pagination state
   */
  private updatePagination(): void {
    const total = this.dataSource.total ?? this.dataSource.data?.length ?? 0;
    this.pagination.total = total;

    // Use totalPages from server if available (server-side pagination), otherwise calculate
    if (this.dataSource.totalPages !== undefined) {
      this.pagination.totalPages = this.dataSource.totalPages;
    } else {
      this.pagination.totalPages = Math.ceil(total / this.pagination.pageSize);
    }

    if (this.pagination.page > this.pagination.totalPages && this.pagination.totalPages > 0) {
      this.pagination.page = this.pagination.totalPages;
    }

    this.updateDisplayedData();
  }

  /**
   * Get columns
   */
  get columns(): TableColumn[] {
    return this.config.columns || [];
  }

  /**
   * Get actions
   */
  get actions(): TableAction[] {
    return this.config.actions || [];
  }

  /**
   * Card view (mobile) helpers.
   * The table switches to a card layout on mobile (see `useCardView`).
   * These getters resolve which columns play which role in each card.
   */

  /** Column shown prominently as the card title in the header. */
  get cardTitleColumn(): TableColumn | null {
    return this.columns.find(c => c.cardTitle) ?? null;
  }

  /**
   * Column pinned to the status-chip slot in the card header.
   * An explicit `cardStatus` flag wins; otherwise the first status
   * column is used only when a `cardTitle` is also present. Without a
   * title, no status is promoted (all status columns render in the body).
   */
  get cardStatusColumn(): TableColumn | null {
    const explicit = this.columns.find(c => c.cardStatus);
    if (explicit) return explicit;
    return this.cardTitleColumn
      ? this.columns.find(c => c.type === 'status') ?? null
      : null;
  }

  /** Columns rendered as `label : value` rows in the card body. */
  get cardBodyColumns(): TableColumn[] {
    const titleKey = this.cardTitleColumn?.key;
    const statusKey = this.cardStatusColumn?.key;
    return this.columns.filter(
      c =>
        c.type !== 'action' &&
        !c.cardHidden &&
        c.key !== titleKey &&
        c.key !== statusKey
    );
  }

  /** Whether to render cards instead of a table (mobile, unless opted out). */
  get useCardView(): boolean {
    return this.isMobile && this.config.cardViewOnMobile !== false;
  }

  /** Whether a body column should render as a status chip. */
  isStatusColumn(col: TableColumn): boolean {
    return col.type === 'status';
  }

  /**
   * Check if table is loading
   */
  get isLoading(): boolean {
    const loading = this.dataSource.loading ?? false;
    console.log('[TableComponent] isLoading:', loading);
    return loading;
  }

  /**
   * Check if table is empty
   */
  get isEmpty(): boolean {
    const empty = !this.isLoading && this.displayedData.length === 0;
    console.log('[TableComponent] isEmpty:', empty, '(loading:', this.isLoading, ', displayedData.length:', this.displayedData.length, ')');
    return empty;
  }

  /**
   * Get total pages
   */
  get totalPages(): number {
    return this.pagination.totalPages;
  }

  /**
   * Get pagination end index for display
   * For server-side pagination, uses actual data length
   */
  getPaginationEnd(): number {
    const start = (this.pagination.page - 1) * this.pagination.pageSize + 1;
    const dataLength = this.dataSource.data?.length || 0;

    if (dataLength === 0) {
      return 0;
    }

    // For server-side pagination, add the start index to the data length minus 1
    return start + dataLength - 1;
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const current = this.pagination.page;
    const total = this.totalPages;

    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Handle search input
   */
  onSearch(value: string): void {
    this.searchSubject.next(value);
  }

  /**
   * Apply search filter
   */
  private applySearch(value: string): void {
    this.searchValue = value;
    // Emit filter change for parent to handle
    this.filterChange.emit([
      {
        column: 'search',
        value: value.toLowerCase(),
        operator: 'contains'
      }
    ]);
  }

  /**
   * Handle sort
   */
  onSort(column: TableColumn): void {
    if (!column.sortable || !this.config.sortable) return;

    if (this.sortState.column === column.key) {
      // Toggle direction
      if (this.sortState.direction === 'asc') {
        this.sortState.direction = 'desc';
      } else if (this.sortState.direction === 'desc') {
        this.sortState.direction = null;
      } else {
        this.sortState.direction = 'asc';
      }
    } else {
      this.sortState.column = column.key as string;
      this.sortState.direction = 'asc';
    }

    this.sortChange.emit(this.sortState);
  }

  /**
   * Get sort icon for column
   */
  getSortIcon(column: TableColumn): string | null {
    if (this.sortState.column !== column.key) return 'caret-up-down-outline';
    if (this.sortState.direction === 'asc') return 'caret-up';
    if (this.sortState.direction === 'desc') return 'caret-down';
    return 'caret-up-down-outline';
  }

  /**
   * Handle pagination change
   */
  onPageChange(page: number): void {
    this.pagination.page = page;
    this.pageChange.emit(page);
    this.updateDisplayedData();
  }

  /**
   * Handle page size change
   */
  onPageSizeChange(event: any): void {
    this.pagination.pageSize = event.detail.value;
    this.pagination.page = 1;
    this.updateDisplayedData();
    this.updatePagination();
    this.pageSizeChange.emit(this.pagination.pageSize);
  }

  /**
   * Handle row click
   */
  onRowClick(item: T): void {
    this.rowClick.emit(item);
  }

  /**
   * Handle action click
   */
  async onActionClick(action: TableAction, item: T, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    // Check if action is disabled
    if (action.disabled && action.disabled(item)) {
      return;
    }

    // Check if confirmation is needed
    if (action.confirm) {
      const confirmed = await this.showConfirmDialog(action.confirm);
      if (!confirmed) return;
    }

    this.actionClick.emit({ action, item });
  }

  /**
   * Show confirmation dialog
   */
  private async showConfirmDialog(config: NonNullable<TableAction['confirm']>): Promise<boolean> {
    const alert = await this.alertController.create({
      header: config.title,
      message: config.message,
      buttons: [
        {
          text: config.cancelText || 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: config.confirmText || 'Confirm',
          role: 'destructive'
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }

  /**
   * Check if action should be shown
   */
  shouldShowAction(action: TableAction, item: T): boolean {
    return action.show ? action.show(item) : true;
  }

  /**
   * Check if action is disabled
   */
  isActionDisabled(action: TableAction, item: T): boolean {
    return action.disabled ? action.disabled(item) : false;
  }

  /**
   * Format cell value based on column type
   */
  formatValue(item: T, column: TableColumn): string | number {
    const value = this.getNestedValue(item, column.key);

    switch (column.type) {
      case 'currency':
        return this.formatCurrency(value as number);
      case 'date':
        return this.formatDate(value as string);
      case 'number':
        return this.formatNumber(value as number);
      case 'status':
        return this.getStatusLabel(value as string);
      default:
        return value ?? '-';
    }
  }

  /**
   * Get nested value from object
   * Made public for use in template
   */
  getNestedValue(obj: any, key: string | number | symbol): any {
    const keyString = String(key);
    return keyString.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  /**
   * Format currency
   */
  private formatCurrency(value: number): string {
    const options = { ...this.defaultCurrencyOptions, ...this.currencyOptions };
    return new Intl.NumberFormat(options.locale, {
      style: 'currency',
      currency: options.currency,
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits
    }).format(value || 0);
  }

  /**
   * Format date
   */
  private formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    const options = { ...this.defaultDateOptions, ...this.dateOptions };
    return date.toLocaleDateString(options.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Format number
   */
  private formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value || 0);
  }

  /**
   * Get status label
   */
  private getStatusLabel(value: any): string {
    const badge = this.statusBadges?.find(b => b.value === value);
    return badge?.label || String(value ?? '-');
  }

  /**
   * Get status badge color
   */
  getStatusColor(value: any): string {
    const badge = this.statusBadges?.find(b => b.value === value);
    return badge?.color || 'medium';
  }

  /**
   * Get status badge icon
   */
  getStatusIcon(value: any): string | undefined {
    const badge = this.statusBadges?.find(b => b.value === value);
    return badge?.icon;
  }

  /**
   * Get cell alignment class
   */
  getAlignClass(column: TableColumn): string {
    return `text-${column.align || 'left'}`;
  }

  /**
   * Resolve the per-cell class list for a cell (alignment + optional cellClass).
   * cellClass may be a static string or a function evaluated per row item,
   * so a column can style individual cells based on their data
   * (e.g. negative/danger amounts).
   */
  getCellClasses(column: TableColumn, item: T): string {
    const classes = [this.getAlignClass(column)];
    const cellClass = column.cellClass;
    if (cellClass) {
      classes.push(typeof cellClass === 'function' ? cellClass(item) : cellClass);
    }
    return classes.filter(Boolean).join(' ');
  }

  /**
   * Get table wrapper class
   */
  getTableWrapperClass(): string {
    const classes: string[] = ['table-wrapper'];

    if (this.config.compact) classes.push('table-compact');
    if (this.config.hoverable) classes.push('table-hoverable');
    if (this.config.striped) classes.push('table-striped');
    if (this.config.bordered) classes.push('table-bordered');

    return classes.join(' ');
  }

  /**
   * Track by function for ngFor
   */
  trackByFn(index: number, item: T): string {
    return (item as any).id || index;
  }
}
