import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';

/**
 * Custom validation error messages
 */
export const VALIDATION_ERRORS = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  minlength: 'Must be at least {requiredLength} characters',
  maxlength: 'Must be no more than {requiredLength} characters',
  pattern: 'Invalid format',
  min: 'Must be at least {min}',
  max: 'Must be no more than {max}',
  passwordMismatch: 'Passwords do not match',
  weakPassword: 'Password must contain at least 8 characters, including uppercase, lowercase, number and special character',
  usernameTaken: 'Username is already taken',
  emailTaken: 'Email is already registered'
};

/**
 * Common regex patterns
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,50}$/,
  PHONE: /^[0-9]{10,15}$/
};

/**
 * Get error message for validation errors
 */
export function getErrorMessage(errors: ValidationErrors | null, fieldName?: string): string {
  if (!errors) return '';

  const errorKey = Object.keys(errors)[0];
  const error = errors[errorKey];

  if (errorKey === 'required') {
    return `${fieldName || 'This field'} is required`;
  }
  if (errorKey === 'email') {
    return 'Please enter a valid email address';
  }
  if (errorKey === 'minlength') {
    return `Must be at least ${error.requiredLength} characters`;
  }
  if (errorKey === 'maxlength') {
    return `Must be no more than ${error.requiredLength} characters`;
  }
  if (errorKey === 'pattern') {
    return 'Invalid format';
  }
  if (errorKey === 'passwordMismatch') {
    return 'Passwords do not match';
  }
  if (errorKey === 'weakPassword') {
    return 'Password must be at least 8 characters with uppercase, lowercase, number and special character';
  }
  if (errorKey === 'min') {
    return `Must be at least ${error.min}`;
  }
  if (errorKey === 'max') {
    return `Must be no more than ${error.max}`;
  }

  return 'Invalid value';
}

/**
 * Password strength validator
 * Requires: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export function strongPassword(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const value = control.value as string;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[@$!%*?&]/.test(value);
    const isLongEnough = value.length >= 8;

    const isValid = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isLongEnough;

    return isValid ? null : { weakPassword: true };
  };
}

/**
 * Match fields validator (e.g., password and confirm password)
 */
export function matchFields(controlName: string, matchingControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const form = control.parent;
    if (!form) {
      return null;
    }

    const controlValue = form.get(controlName)?.value;
    const matchingControlValue = form.get(matchingControlName)?.value;

    if (controlValue !== matchingControlValue) {
      return { passwordMismatch: true };
    }

    return null;
  };
}

/**
 * Username validator (alphanumeric and underscore, 3-50 chars)
 */
export function validUsername(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const isValid = REGEX_PATTERNS.USERNAME.test(control.value);
    return isValid ? null : { pattern: true };
  };
}

/**
 * Phone number validator
 */
export function validPhone(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const isValid = REGEX_PATTERNS.PHONE.test(control.value);
    return isValid ? null : { pattern: true };
  };
}

/**
 * Custom validator factory for async validation
 */
export function asyncValidator<T>(
  validationFn: (value: T) => Observable<boolean>,
  errorKey: string,
  debounceMs = 500
): ValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) {
      return of(null);
    }

    // Add debounce for async validation
    return new Observable(observer => {
      const timeout = setTimeout(() => {
        validationFn(control.value).subscribe({
          next: (isValid) => {
            observer.next(isValid ? null : { [errorKey]: true });
            observer.complete();
          },
          error: () => {
            observer.next(null); // On error, don't show validation error
            observer.complete();
          }
        });
      }, debounceMs);

      return () => clearTimeout(timeout);
    });
  };
}

/**
 * Common validators object for reusability
 */
export const COMMON_VALIDATORS = {
  email: [Validators.required, Validators.email, Validators.pattern(REGEX_PATTERNS.EMAIL)],
  password: [Validators.required, Validators.minLength(6), strongPassword()],
  username: [Validators.required, Validators.minLength(3), Validators.maxLength(50), validUsername()],
  phone: [Validators.pattern(REGEX_PATTERNS.PHONE)],
  required: [Validators.required]
};
