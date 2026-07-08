import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ValidationMessages, SelectOption } from '../form.model';

/**
 * Reusable Form Select Component
 * Features: label, validation messages, border styling, multiple selection support
 *
 * Usage:
 * - With formControlName: <app-form-select formControlName="fieldName" ... />
 * - Parent form is responsible for validation and passing error state via @Input
 */
@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  templateUrl: './form-select.component.html',
  styleUrls: ['./form-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormSelectComponent),
      multi: true
    }
  ]
})
export class FormSelectComponent implements ControlValueAccessor, OnInit, OnChanges {
  // Label and display
  @Input() label = '';
  @Input() labelColor: string = 'primary';
  @Input() labelPosition: 'stacked' | 'floating' | 'fixed' = 'stacked';
  @Input() required = false;
  @Input() placeholder = 'Select an option';
  @Input() helperText = '';

  // Error state (passed from parent form)
  @Input() showError: boolean = false;
  @Input() errorMessage: string = '';

  // Select attributes
  @Input() options: SelectOption[] = [];
  @Input() multiple = false;
  @Input() compareWith: (o1: any, o2: any) => boolean = (o1, o2) => o1 === o2;
  @Input() disabled = false;

  // Styling
  @Input() border: boolean = true;
  @Input() borderRadius: string = '8px';
  @Input() borderColor: string = 'var(--ion-color-medium-shade, #92949e)';
  @Input() focusColor: string = 'var(--ion-color-primary, #3880ff)';
  @Input() errorColor: string = 'var(--ion-color-danger, #eb445a)';
  @Input() bgColor: string = 'var(--ion-background-color, #ffffff)';

  // Validation messages (kept for backward compatibility / utility)
  @Input() validationMessages: ValidationMessages = {};

  // Internal state
  value: any = this.multiple ? [] : null;
  isDisabled = false;

  ngOnInit(): void {
    // Initialize value for multiple select
    if (this.multiple && !this.value) {
      this.value = [];
    }

    // Default validation messages (for reference/utility)
    const defaultMessages: ValidationMessages = {
      required: 'Please select an option'
    };
    this.validationMessages = { ...defaultMessages, ...this.validationMessages };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled']) {
      this.isDisabled = this.disabled;
    }

    if (changes['options']) {
      this.validateSelectedValues();
    }
  }

  /**
   * Validate that selected values are still in options
   */
  private validateSelectedValues(): void {
    if (!this.value) return;

    const validValues = this.options.filter(opt => !opt.disabled).map(opt => opt.value);

    if (this.multiple && Array.isArray(this.value)) {
      this.value = this.value.filter(v => validValues.includes(v));
    } else if (!validValues.includes(this.value)) {
      this.value = null;
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
   */
  writeValue(value: any): void {
    this.value = value;
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
   * Handle selection change
   */
  onSelectionChange(event: any): void {
    const value = event.detail.value;
    this.value = value;
    this.onChange(value);
    this.onTouched();
  }

  /**
   * Handle blur
   */
  onBlur(): void {
    this.onTouched();
  }

  /**
   * Get display label for selected value
   */
  getDisplayLabel(): string {
    if (!this.value) return '';

    if (this.multiple && Array.isArray(this.value)) {
      return this.options
        .filter(opt => this.value.includes(opt.value))
        .map(opt => opt.label)
        .join(', ');
    }

    const option = this.options.find(opt => opt.value === this.value);
    return option ? option.label : '';
  }

  /**
   * Get display label for a single value (for multiple select chips)
   */
  getDisplayLabelForValue(val: any): string {
    const option = this.options.find(opt => opt.value === val);
    return option ? option.label : String(val);
  }

  /**
   * Remove a value from multiple selection
   */
  removeValue(val: any): void {
    if (this.multiple && Array.isArray(this.value)) {
      this.value = this.value.filter(v => v !== val);
      this.onChange(this.value);
    }
  }
}
