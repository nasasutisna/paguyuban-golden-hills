import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { ValidationMessages } from '../form.model';

/**
 * Reusable Form Date Picker Component
 * Uses Ionic's ion-datetime with manual modal control
 *
 * Usage:
 * - With formControlName: <app-form-date-picker formControlName="fieldName" ... />
 * - Parent form is responsible for validation and passing error state via @Input
 */
@Component({
  selector: 'app-form-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  templateUrl: './form-date-picker.component.html',
  styleUrls: ['./form-date-picker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormDatePickerComponent),
      multi: true
    }
  ]
})
export class FormDatePickerComponent implements ControlValueAccessor, OnInit, OnChanges {
  // Label and display
  @Input() label = '';
  @Input() labelColor: string = 'primary';
  @Input() labelPosition: 'stacked' | 'floating' | 'fixed' = 'stacked';
  @Input() required = false;
  @Input() placeholder = 'Pilih tanggal';
  @Input() helperText = '';

  // Error state (passed from parent form)
  @Input() showError: boolean = false;
  @Input() errorMessage: string = '';

  // Date picker attributes
  @Input() locale: string = 'id-ID';
  @Input() minDate?: string;
  @Input() maxDate?: string;
  @Input() disabled = false;
  @Input() clearable = false;
  @Input() firstDayOfWeek: number = 0; // 0 = Sunday, 1 = Monday, etc.

  // Presentation format
  @Input() presentation: 'date' | 'date-time' | 'time-date' | 'time' | 'month-year' | 'month' | 'year' = 'date';

  // Format options for display
  @Input() dateFormatOptions?: Intl.DateTimeFormatOptions;

  // Styling
  @Input() border: boolean = true;
  @Input() borderRadius: string = '8px';
  @Input() borderColor: string = 'var(--ion-color-medium-shade, #92949e)';
  @Input() focusColor: string = 'var(--ion-color-primary, #3880ff)';
  @Input() errorColor: string = 'var(--ion-color-danger, #eb445a)';
  @Input() bgColor: string = 'var(--ion-background-color, #ffffff)';
  @Input() padding: string = '12px 16px';

  // Validation messages (kept for backward compatibility / utility)
  @Input() validationMessages: ValidationMessages = {};

  // View children
  @ViewChild('datetimeModal') datetimeModal!: any;
  @ViewChild('datetime') datetime!: any;

  // Internal state for ControlValueAccessor
  value: string | null = null;
  tempValue: string | null = null; // Temporary value before confirmation
  isDisabled = false;
  isTouched = false;
  isModalOpen = false;

  // Default date format options
  private defaultDateFormatOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  };

  constructor(private modalController: ModalController) {}

  ngOnInit(): void {
    // Default validation messages
    const defaultMessages: ValidationMessages = {
      required: 'This field is required',
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
   * Called by Angular to set the value programmatically
   */
  writeValue(value: any): void {
    this.value = value;
  }

  /**
   * ControlValueAccessor: registerOnChange
   * Register a callback that Angular calls when the value changes
   */
  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  /**
   * ControlValueAccessor: registerOnTouched
   * Register a callback that Angular calls when the input is touched
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * ControlValueAccessor: setDisabledState
   * Called by Angular when the form control is disabled/enabled
   */
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  /**
   * Open the datetime modal
   */
  presentDatetimeModal(): void {
    if (this.isDisabled) return;

    this.isTouched = true;
    this.onTouched();

    // Reset temp value to current value when opening modal
    this.tempValue = this.value;
    this.isModalOpen = true;
  }

  /**
   * Handle date value change from ion-datetime
   * (updates temp value, not the actual value until confirmed)
   */
  onDateTimeChange(event: CustomEvent): void {
    this.tempValue = event.detail.value;
  }

  /**
   * Confirm and save the selected date
   */
  confirmDate(): void {
    if (this.tempValue !== null) {
      this.value = this.tempValue;
      this.onChange(this.value);
    }
    this.dismissModal();
  }

  /**
   * Dismiss the modal without saving
   */
  dismissModal(): void {
    this.isModalOpen = false;
    this.tempValue = null;
  }

  /**
   * Handle modal dismiss event
   */
  onModalDismiss(): void {
    this.isModalOpen = false;
    this.tempValue = null;
  }

  /**
   * Clear the date value
   */
  clearDate(): void {
    if (this.isDisabled || !this.clearable) return;
    this.value = null;
    this.onChange(null);
  }

  /**
   * Get the format options to use
   */
  getFormatOptions(): any {
    return this.dateFormatOptions || this.defaultDateFormatOptions;
  }

  /**
   * Check if value is empty
   */
  get isEmpty(): boolean {
    return !this.value || this.value === '';
  }

  /**
   * Get display format string for Angular date pipe
   */
  getDisplayFormat(): string {
    const options = this.dateFormatOptions || this.defaultDateFormatOptions;
    // Map Intl.DateTimeFormatOptions to Angular date pipe format
    if (options.day === 'numeric' && options.month === 'short' && options.year === 'numeric') {
      return 'd MMM y';
    }
    if (options.day === '2-digit' && options.month === '2-digit' && options.year === 'numeric') {
      return 'dd/MM/yyyy';
    }
    if (options.day === 'numeric' && options.month === 'long' && options.year === 'numeric') {
      return 'd MMMM y';
    }
    // Default format
    return 'd MMM y';
  }
}
