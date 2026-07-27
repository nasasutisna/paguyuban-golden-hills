import { CommonModule } from '@angular/common';
import { Component, EventEmitter, forwardRef, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { SearchableSelectModalComponent } from '../searchable-select-modal/searchable-select-modal.component';
import { SelectOption, ValidationMessages } from '../form.model';

/**
 * Reusable Form Searchable Select Component
 *
 * A select-like form control that opens a searchable modal instead of Ionic's
 * native `ion-select` (which has no search support). Mirrors the display
 * contract of `FormSelectComponent` and the CVA + modal pattern of
 * `FormDatePickerComponent`.
 *
 * Usage:
 * - With formControlName: <app-form-searchable-select formControlName="field" [options]="opts" ... />
 * - Parent form is responsible for validation and passes error state via @Input.
 *
 * `(ngModelChange)` fires reliably for a custom CVA — Angular re-emits the
 * registered `onChange` callback as `ngModelChange` (verified against
 * `FormControlName` in @angular/forms). No dedicated output is required.
 */
@Component({
  selector: 'app-form-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  templateUrl: './form-searchable-select.component.html',
  styleUrls: ['./form-searchable-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormSearchableSelectComponent),
      multi: true,
    },
  ],
})
export class FormSearchableSelectComponent implements ControlValueAccessor, OnInit, OnChanges {
  private modalController = inject(ModalController);

  // Label and display
  @Input() label = '';
  @Input() labelColor: string = 'primary';
  @Input() labelPosition: 'stacked' | 'floating' | 'fixed' = 'stacked';
  @Input() required = false;
  @Input() placeholder = 'Pilih opsi';
  @Input() helperText = '';

  // Error state (passed from parent form)
  @Input() showError = false;
  @Input() errorMessage = '';

  // Select attributes
  @Input() options: SelectOption[] = [];
  @Input() disabled = false;
  @Input() clearable = false;

  // Modal behaviour
  @Input() modalTitle = 'Pilih opsi';
  @Input() searchPlaceholder = 'Cari...';
  @Input() emptyText = 'Tidak ada data';
  /** Optional server-side search; when omitted the modal filters `options` client-side. */
  @Input() searchFn?: (query: string) => Observable<SelectOption[]>;
  @Input() compareWith: (a: any, b: any) => boolean = (a, b) => a === b;

  // Styling
  @Input() border = true;
  @Input() borderRadius = '8px';
  @Input() borderColor = 'var(--ion-color-medium-shade, #92949e)';

  // Validation messages (kept for backward compatibility / utility)
  @Input() validationMessages: ValidationMessages = {};

  /** Fires only on genuine user selection (not programmatic writeValue). */
  @Output() valueChange = new EventEmitter<any>();

  // Internal state for ControlValueAccessor
  value: any = null;
  /** Cached option from last user selection so the label renders even before `options` loads. */
  selectedOption: SelectOption | null = null;
  isDisabled = false;

  ngOnInit(): void {
    const defaultMessages: ValidationMessages = {
      required: 'Field ini wajib diisi',
    };
    this.validationMessages = { ...defaultMessages, ...this.validationMessages };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled']) {
      this.isDisabled = this.disabled;
    }
  }

  /**
   * ControlValueAccessor: onChange callback
   */
  private onChange: (value: any) => void = () => {};

  /**
   * ControlValueAccessor: onTouched callback
   */
  private onTouched: () => void = () => {};

  /**
   * ControlValueAccessor: writeValue
   * Called by Angular to set the value programmatically (e.g. prefill, reset).
   * NOTE: never call `onChange` here — Angular forbids it (feedback loop).
   */
  writeValue(value: any): void {
    this.value = value;
    // Programmatic set: drop the cached label so we fall back to options lookup.
    this.selectedOption = null;
  }

  /**
   * ControlValueAccessor: registerOnChange
   */
  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  /**
   * ControlValueAccessor: registerOnTouched
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * ControlValueAccessor: setDisabledState
   */
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  /**
   * Open the searchable select modal.
   */
  async openModal(): Promise<void> {
    if (this.isDisabled) return;
    this.onTouched();

    const modal = await this.modalController.create({
      component: SearchableSelectModalComponent,
      componentProps: {
        options: this.options,
        selectedValue: this.value,
        title: this.modalTitle,
        searchPlaceholder: this.searchPlaceholder,
        emptyText: this.emptyText,
        searchFn: this.searchFn,
        compareWith: this.compareWith,
      },
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    // Backdrop / swipe dismiss yields data === undefined → leave value as-is.
    if (data) {
      const option = data as SelectOption;
      this.selectedOption = option;
      this.value = option.value;
      this.onChange(option.value);
      this.valueChange.emit(option.value);
    }
  }

  /**
   * Clear the current value.
   */
  clear(event?: Event): void {
    if (this.isDisabled || !this.clearable) return;
    event?.stopPropagation();
    this.selectedOption = null;
    this.value = null;
    this.onChange(null);
    this.valueChange.emit(null);
    this.onTouched();
  }

  /**
   * Label shown on the trigger. Prefers the cached selection, then falls back
   * to a lookup in `options` (handles prefill where value was set programmatically).
   * Re-evaluated each change-detection cycle, so the label renders as soon as
   * `options` arrives.
   */
  getDisplayLabel(): string {
    if (this.selectedOption) {
      return this.selectedOption.label;
    }
    const found = this.options.find((o) => this.compareWith(o.value, this.value));
    return found?.label ?? '';
  }

  get isEmpty(): boolean {
    return !this.getDisplayLabel();
  }
}
