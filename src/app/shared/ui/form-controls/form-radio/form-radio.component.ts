import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ValidationMessages, RadioOption } from '../form.model';

/**
 * Reusable Form Radio Component
 * Features: label, validation messages, vertical/horizontal layout
 *
 * Usage:
 * - With formControlName: <app-form-radio formControlName="fieldName" ... />
 * - Parent form is responsible for validation and passing error state via @Input
 */
@Component({
  selector: 'app-form-radio',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  templateUrl: './form-radio.component.html',
  styleUrls: ['./form-radio.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormRadioComponent),
      multi: true
    }
  ]
})
export class FormRadioComponent implements ControlValueAccessor, OnInit, OnChanges {
  // Label and display
  @Input() label = '';
  @Input() labelColor: string = 'primary';
  @Input() labelPosition: 'stacked' | 'floating' | 'fixed' = 'stacked';
  @Input() required = false;
  @Input() helperText = '';

  // Error state (passed from parent form)
  @Input() showError: boolean = false;
  @Input() errorMessage: string = '';

  // Radio attributes
  @Input() options: RadioOption[] = [];
  @Input() layout: 'vertical' | 'horizontal' = 'vertical';
  @Input() disabled = false;

  // Styling
  @Input() borderColor: string = 'var(--ion-color-medium-shade, #92949e)';
  @Input() checkedColor: string = 'var(--ion-color-primary, #3880ff)';
  @Input() errorColor: string = 'var(--ion-color-danger, #eb445a)';

  // Validation messages (kept for backward compatibility / utility)
  @Input() validationMessages: ValidationMessages = {};

  // Internal state
  value: any = null;
  isDisabled = false;

  ngOnInit(): void {
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
      this.validateSelectedValue();
    }
  }

  /**
   * Validate that selected value is still in options
   */
  private validateSelectedValue(): void {
    if (this.value === null || this.value === undefined) return;

    const validValues = this.options.filter(opt => !opt.disabled).map(opt => opt.value);
    if (!validValues.includes(this.value)) {
      this.value = null;
      this.onChange(null);
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
   * Check if option is selected
   */
  isSelected(optionValue: any): boolean {
    return this.value === optionValue;
  }

  /**
   * Check if option is disabled
   */
  isOptionDisabled(option: RadioOption): boolean {
    return option.disabled || this.isDisabled;
  }
}
