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
 * Reusable Form Textarea Component
 * Features: label, validation messages, border styling, auto-grow support
 *
 * Usage:
 * - With formControlName: <app-form-textarea formControlName="fieldName" ... />
 * - Parent form is responsible for validation and passing error state via @Input
 */
@Component({
  selector: 'app-form-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  templateUrl: './form-textarea.component.html',
  styleUrls: ['./form-textarea.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormTextareaComponent),
      multi: true
    }
  ]
})
export class FormTextareaComponent implements ControlValueAccessor, OnInit, OnChanges {
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

  // Textarea attributes
  @Input() rows = 4;
  @Input() cols: number | null = null;
  @Input() autoGrow = false;
  @Input() maxlength: number | null = null;
  @Input() minlength: number | null = null;
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
  @Input() minHeight: string = '100px';
  @Input() maxHeight: string | null = null;

  // Validation messages (kept for backward compatibility / utility)
  @Input() validationMessages: ValidationMessages = {};

  // Character count
  @Input() showCharCount = false;

  // Internal state
  value: any = '';
  isDisabled = false;
  remainingChars: number | null = null;

  ngOnInit(): void {
    // Default validation messages (for reference/utility)
    const defaultMessages: ValidationMessages = {
      required: 'This field is required',
      minlength: 'Minimum length is {{requiredLength}} characters',
      maxlength: 'Maximum length is {{requiredLength}} characters'
    };
    this.validationMessages = { ...defaultMessages, ...this.validationMessages };

    // Initialize character count
    if (this.showCharCount && this.maxlength) {
      this.updateCharCount();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled']) {
      this.isDisabled = this.disabled;
    }

    if (changes['maxlength']) {
      if (this.showCharCount) {
        this.updateCharCount();
      }
    }
  }

  /**
   * Update character count
   */
  private updateCharCount(): void {
    if (this.maxlength) {
      this.remainingChars = this.maxlength - (this.value?.length || 0);
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
    if (this.showCharCount && this.maxlength) {
      this.updateCharCount();
    }
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
   * Handle input change
   */
  onInputChange(event: any): void {
    const value = event.detail.value;
    this.value = value;
    this.onChange(value);

    if (this.showCharCount && this.maxlength) {
      this.updateCharCount();
    }
  }

  /**
   * Handle blur
   */
  onBlur(): void {
    this.onTouched();
  }

  /**
   * Check if character count is low
   */
  get isCharCountLow(): boolean {
    return this.showCharCount && this.remainingChars !== null && this.remainingChars <= 10;
  }
}
