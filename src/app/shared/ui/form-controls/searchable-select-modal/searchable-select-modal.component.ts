import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Observable, of, Subject, switchMap } from 'rxjs';
import { IonicModule, ModalController, SearchbarCustomEvent } from '@ionic/angular';
import { SelectOption } from '../form.model';

/**
 * Generic searchable select modal.
 *
 * Opens from `FormSearchableSelectComponent` (or directly via ModalController).
 * - Default: client-side filter over the provided `options` by `label`.
 * - Optional `searchFn`: switches to server-side search (rxjs switchMap cancels
 *   stale requests) for very large lists.
 *
 * Dismisses with the selected `SelectOption` (full object, not just `value`)
 * so the caller can render the label even when its own `options` list isn't
 * loaded yet. Backdrop / swipe dismiss yields `data === undefined`.
 */
@Component({
  selector: 'app-searchable-select-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './searchable-select-modal.component.html',
  styleUrls: ['./searchable-select-modal.component.scss'],
})
export class SearchableSelectModalComponent implements OnInit {
  private modalController = inject(ModalController);
  private destroyRef = inject(DestroyRef);

  @Input() options: SelectOption[] = [];
  @Input() selectedValue: any = undefined;
  @Input() title = 'Pilih opsi';
  @Input() searchPlaceholder = 'Cari...';
  @Input() emptyText = 'Tidak ada data';
  /** When provided, search runs server-side instead of filtering `options`. */
  @Input() searchFn?: (query: string) => Observable<SelectOption[]>;
  @Input() compareWith: (a: any, b: any) => boolean = (a, b) => a === b;

  filteredOptions: SelectOption[] = [];
  loading = false;
  searchQuery = '';

  private query$ = new Subject<string>();

  constructor() {
    this.query$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (this.searchFn) {
            this.loading = true;
            return this.searchFn(q);
          }
          return of(this.localFilter(q));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (results) => {
          this.filteredOptions = results;
          this.loading = false;
        },
        error: (err) => {
          console.error('Searchable select search error:', err);
          this.filteredOptions = [];
          this.loading = false;
        },
      });
  }

  ngOnInit(): void {
    // Seed list: server-side runs an initial empty query; client-side shows all.
    if (this.searchFn) {
      this.query$.next('');
    } else {
      this.filteredOptions = this.localFilter('');
    }
  }

  onSearch(event: SearchbarCustomEvent): void {
    this.searchQuery = event.detail.value ?? '';
    this.query$.next(this.searchQuery.trim());
  }

  isSelected(opt: SelectOption): boolean {
    return this.compareWith(opt.value, this.selectedValue);
  }

  select(opt: SelectOption): void {
    this.modalController.dismiss(opt);
  }

  cancel(): void {
    this.modalController.dismiss();
  }

  private localFilter(query: string): SelectOption[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter((opt) => opt.label?.toLowerCase().includes(q));
  }
}
