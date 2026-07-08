/**
 * Form Control Models
 * Shared interfaces and types for form control components
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validation message configuration
 */
export interface ValidationMessages {
  [key: string]: string | ((control: AbstractControl) => string);
}

/**
 * Base form control interface
 */
export interface BaseFormControl {
  label: string;
  name: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  validations?: ValidationMessages;
}

/**
 * Text input specific options
 */
export interface TextInputOptions extends BaseFormControl {
  type?: 'text' | 'email' | 'number' | 'password' | 'tel' | 'url';
  maxlength?: number;
  minlength?: number;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  autocomplete?: string;
}

/**
 * Select option
 */
export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
}

/**
 * Select input specific options
 */
export interface SelectInputOptions extends BaseFormControl {
  options: SelectOption[];
  multiple?: boolean;
  compareWith?: (o1: any, o2: any) => boolean;
}

/**
 * Radio option
 */
export interface RadioOption {
  value: any;
  label: string;
  disabled?: boolean;
}

/**
 * Radio input specific options
 */
export interface RadioInputOptions extends BaseFormControl {
  options: RadioOption[];
  layout?: 'vertical' | 'horizontal';
}

/**
 * Textarea specific options
 */
export interface TextareaOptions extends BaseFormControl {
  rows?: number;
  cols?: number;
  autoGrow?: boolean;
  maxlength?: number;
}

/**
 * Button variant
 */
export type ButtonVariant = 'solid' | 'outline' | 'clear' | 'ghost';

/**
 * Button size
 */
export type ButtonSize = 'small' | 'default' | 'large';

/**
 * Button options
 */
export interface ButtonOptions {
  text: string;
  icon?: string;
  iconSlot?: 'start' | 'end' | 'icon-only';
  variant?: ButtonVariant;
  color?: string;
  size?: ButtonSize;
  expand?: 'block' | 'full';
  disabled?: boolean;
  type?: 'button' | 'submit';
}
