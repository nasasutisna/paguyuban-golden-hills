import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ValidationMessages } from '../form.model';

/**
 * Reusable Form Input Component
 * Features: label, validation messages, border styling, consistent design
 *
 * Usage:
 * - With formControlName: <app-form-input formControlName="fieldName" ... />
 * - Parent form is responsible for validation and passing error state via @Input
 */
@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  templateUrl: './form-input.component.html',
  styleUrls: ['./form-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormInputComponent),
      multi: true
    }
  ]
})
export class FormInputComponent implements ControlValueAccessor, OnInit, OnChanges {
  // Label and display
  @Input() label = '';
  @Input() labelColor: string = 'primary';
  @Input() labelPosition: 'stacked' | 'floating' | 'fixed' = 'stacked';
  @Input() required = false;
  @Input() placeholder = '';
  @Input() helperText = '';

  // Error state (passed from parent form)
  @Input() showError: boolean = false;
  @Input() errorMessage: string = '';

  // Input attributes
  @Input() type: 'text' | 'email' | 'number' | 'password' | 'tel' | 'url' = 'text';
  @Input() maxlength: number | null = null;
  @Input() minlength: number | null = null;
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() step: number | null = null;
  @Input() prefix = '';
  @Input() suffix = '';
  @Input() autocomplete = '';
  @Input() readonly = false;
  @Input() disabled = false;

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

  // Internal state for ControlValueAccessor
  value: any = '';
  isDisabled = false;
  isTouched = false;

  ngOnInit(): void {
    // Default validation messages (for reference/utility)
    const defaultMessages: ValidationMessages = {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      minlength: 'Minimum length is {{requiredLength}} characters',
      maxlength: 'Maximum length is {{requiredLength}} characters',
      min: 'Minimum value is {{min}}',
      max: 'Maximum value is {{max}}',
      pattern: 'Please enter a valid value'
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
   * Handle input change
   */
  onInputChange(event: any): void {
    const value = event.detail.value;
    this.value = value;
    this.onChange(value);
  }

  /**
   * Handle blur
   */
  onBlur(): void {
    this.isTouched = true;
    this.onTouched();
  }
}
