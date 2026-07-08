# Form Controls Component Library

Reusable form components with consistent styling, built-in validation, and full Ionic framework integration.

## Components

### 1. app-form-input

Text input with label, border styling, and validation messages.

**Usage:**
```html
<!-- Using formControlName -->
<app-form-input
  formControlName="firstName"
  label="First Name"
  labelColor="primary"
  labelPosition="stacked"
  type="text"
  placeholder="Enter first name"
  required="true"
  maxlength="50"
  helperText="Please provide your legal first name"
  [validationMessages]="{
    required: 'First name is required',
    maxlength: 'First name cannot exceed 50 characters'
  }"
></app-form-input>

<!-- Using formControl -->
<app-form-input
  [formControl]="emailControl"
  label="Email Address"
  type="email"
  placeholder="example@email.com"
  required="true"
  border="true"
  borderRadius="8px"
></app-form-input>

<!-- Number input with prefix/suffix -->
<app-form-input
  formControlName="price"
  label="Price"
  type="number"
  prefix="$"
  suffix=".00"
  placeholder="0.00"
  [min]="0"
></app-form-input>
```

**Properties:**
- `formControl | formControlName` - FormControl to bind
- `label` - Field label text
- `required` - Show required asterisk
- `type` - Input type (text, email, number, password, tel, url)
- `placeholder` - Placeholder text
- `border` - Show border (default: true)
- `borderRadius` - Border radius (default: '8px')
- `validationMessages` - Custom error messages object
- `helperText` - Helper text shown below input
- `maxlength` - Maximum character length
- `prefix / suffix` - Text before/after input value

---

### 2. app-form-select

Dropdown select with label and validation.

**Usage:**
```html
<!-- Basic select -->
<app-form-select
  formControlName="country"
  label="Country"
  placeholder="Select a country"
  [options]="countryOptions"
  required="true"
></app-form-select>

// In component.ts
countryOptions = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'id', label: 'Indonesia' }
];

<!-- Multiple select -->
<app-form-select
  formControlName="interests"
  label="Interests"
  placeholder="Select interests"
  [options]="interestOptions"
  [multiple]="true"
  helperText="You can select multiple interests"
></app-form-select>
```

**Properties:**
- `formControl | formControlName` - FormControl to bind
- `label` - Field label text
- `options` - Array of SelectOption: `{ value, label, disabled? }`
- `multiple` - Allow multiple selections
- `placeholder` - Placeholder text
- `required` - Show required asterisk
- `compareWith` - Custom comparison function

---

### 3. app-form-radio

Radio button group with vertical/horizontal layout.

**Usage:**
```html
<!-- Vertical layout (default) -->
<app-form-radio
  formControlName="gender"
  label="Gender"
  [options]="[
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ]"
  required="true"
></app-form-radio>

<!-- Horizontal layout -->
<app-form-radio
  formControlName="plan"
  label="Subscription Plan"
  layout="horizontal"
  [options]="planOptions"
></app-form-radio>
```

**Properties:**
- `formControl | formControlName` - FormControl to bind
- `label` - Field label text
- `options` - Array of RadioOption: `{ value, label, disabled? }`
- `layout` - 'vertical' or 'horizontal' (default: 'vertical')
- `required` - Show required asterisk

---

### 4. app-form-textarea

Multi-line text input with auto-grow and character count.

**Usage:**
```html
<!-- Basic textarea -->
<app-form-textarea
  formControlName="description"
  label="Description"
  placeholder="Enter description..."
  rows="4"
  required="true"
></app-form-textarea>

<!-- With character count -->
<app-form-textarea
  formControlName="bio"
  label="Bio"
  placeholder="Tell us about yourself..."
  rows="5"
  [maxlength]="500"
  [showCharCount]="true"
  helperText="Write a short bio (max 500 characters)"
></app-form-textarea>

<!-- Auto-growing textarea -->
<app-form-textarea
  formControlName="message"
  label="Message"
  placeholder="Type your message..."
  [autoGrow]="true"
></app-form-textarea>
```

**Properties:**
- `formControl | formControlName` - FormControl to bind
- `label` - Field label text
- `placeholder` - Placeholder text
- `rows` - Number of rows (default: 4)
- `autoGrow` - Auto-grow as content increases
- `maxlength` - Maximum character length
- `showCharCount` - Show remaining characters
- `required` - Show required asterisk

---

### 5. app-form-button

Consistently styled button with loading state.

**Usage:**
```html
<!-- Solid primary button -->
<app-form-button
  text="Submit"
  type="submit"
  variant="solid"
  color="primary"
></app-form-button>

<!-- With icon -->
<app-form-button
  text="Save"
  icon="save-outline"
  iconSlot="start"
  type="submit"
></app-form-button>

<!-- Outline button -->
<app-form-button
  text="Cancel"
  variant="outline"
  color="medium"
  (click)="onCancel()"
></app-form-button>

<!-- Loading button -->
<app-form-button
  text="Delete"
  icon="trash-outline"
  color="danger"
  [loading]="isDeleting"
  (click)="onDelete()"
></app-form-button>

<!-- Full width button -->
<app-form-button
  text="Sign In"
  type="submit"
  expand="block"
  size="large"
></app-form-button>
```

**Properties:**
- `text` - Button text
- `icon` - Icon name (Ionic Icons)
- `iconSlot` - 'start', 'end', or 'icon-only'
- `type` - 'button' or 'submit'
- `variant` - 'solid', 'outline', 'clear', 'ghost'
- `color` - Ionic color
- `size` - 'small', 'default', 'large'
- `expand` - 'block' or 'full' for full width
- `loading` - Show loading spinner
- `disabled` - Disable button

---

## Complete Form Example

```html
<form [formGroup]="userForm" (ngSubmit)="onSubmit()">
  <div class="form-section">
    <div class="section-title">Personal Information</div>

    <app-form-input
      formControlName="firstName"
      label="First Name"
      placeholder="Enter first name"
      required="true"
    ></app-form-input>

    <app-form-input
      formControlName="lastName"
      label="Last Name"
      placeholder="Enter last name"
      required="true"
    ></app-form-input>

    <app-form-input
      formControlName="email"
      label="Email"
      type="email"
      placeholder="example@email.com"
      required="true"
    ></app-form-input>

    <app-form-select
      formControlName="country"
      label="Country"
      placeholder="Select country"
      [options]="countries"
      required="true"
    ></app-form-select>

    <app-form-radio
      formControlName="gender"
      label="Gender"
      [options]="genderOptions"
      required="true"
    ></app-form-radio>
  </div>

  <div class="form-section">
    <div class="section-title">Additional Details</div>

    <app-form-textarea
      formControlName="bio"
      label="Bio"
      placeholder="Tell us about yourself..."
      rows="4"
      [maxlength]="500"
      [showCharCount]="true"
    ></app-form-textarea>
  </div>

  <div class="form-actions">
    <app-form-button
      text="Cancel"
      variant="outline"
      (click)="onCancel()"
    ></app-form-button>

    <app-form-button
      text="Save"
      type="submit"
      [loading]="isSubmitting"
      [disabled]="userForm.invalid"
    ></app-form-button>
  </div>
</form>
```

```typescript
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  // ...
})
export class UserFormComponent {
  userForm: FormGroup;
  isSubmitting = false;

  countries = [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'id', label: 'Indonesia' }
  ];

  genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  constructor(private fb: FormBuilder) {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      country: ['', Validators.required],
      gender: ['', Validators.required],
      bio: ['', Validators.maxLength(500)]
    });
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.isSubmitting = true;
      // Submit logic
    }
  }

  onCancel(): void {
    // Cancel logic
  }
}
```

---

## Styling Customization

All components support style customization through input properties:

```html
<app-form-input
  label="Custom Styled Input"
  borderColor="#customColor"
  focusColor="#customFocusColor"
  errorColor="#customErrorColor"
  bgColor="#customBgColor"
  borderRadius="12px"
  padding="16px"
></app-form-input>
```

---

## Shared Styles

Include the shared styles in your global SCSS:

```scss
@import '@app/shared/ui/form-controls/form-controls';
```

This provides:
- `.form-section` - Styled form card/container
- `.form-actions` - Button action toolbar
- `.form-grid` - Grid layout for forms
- `.form-inline` - Compact inline form layout

---

## Validation Messages

Components come with default validation messages that can be customized:

```typescript
validationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email',
  minlength: 'Minimum length is {{requiredLength}} characters',
  maxlength: 'Maximum length is {{requiredLength}} characters',
  min: 'Minimum value is {{min}}',
  max: 'Maximum value is {{max}}'
};
```
