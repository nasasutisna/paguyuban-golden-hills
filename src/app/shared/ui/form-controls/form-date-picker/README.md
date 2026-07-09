# Form Date Picker Component

Komponen date picker untuk Ionic Angular yang menggunakan `ion-datetime-button` dan `ion-datetime` bawaan Ionic Framework.

## Fitur

- ✅ Menggunakan komponen bawaan Ionic (`ion-datetime-button` + `ion-datetime`)
- ✅ Modal kalendar native Ionic dengan navigasi bulan
- ✅ Mendukung locale Indonesia (atau custom locale)
- ✅ Mendukung min/max date
- ✅ Mendukung Reactive Forms (ControlValueAccessor)
- ✅ Validasi dan error handling
- ✅ Konsisten dengan komponen form lainnya
- ✅ Format tanggal yang dikustomisasi
- ✅ Tombol clear (opsional)

## Penggunaan

### Basic Usage

```html
<app-form-date-picker
  formControlName="tanggal"
  label="Tanggal"
  placeholder="Pilih tanggal">
</app-form-date-picker>
```

### Dengan Locale Indonesia

```html
<app-form-date-picker
  formControlName="tanggalLahir"
  label="Tanggal Lahir"
  placeholder="Pilih tanggal lahir"
  locale="id-ID">
</app-form-date-picker>
```

### Dengan Min/Max Date

```html
<app-form-date-picker
  formControlName="tanggalMulai"
  label="Tanggal Mulai"
  minDate="2024-01-01"
  maxDate="2024-12-31">
</app-form-date-picker>
```

### Dengan Clear Button

```html
<app-form-date-picker
  formControlName="optionalDate"
  label="Tanggal (Opsional)"
  placeholder="Opsional"
  [clearable]="true">
</app-form-date-picker>
```

### Dengan Format Tampilan Kustom

```html
<app-form-date-picker
  formControlName="tanggal"
  label="Tanggal"
  [dateFormatOptions]="{ day: '2-digit', month: 'long', year: 'numeric' }">
</app-form-date-picker>
```

### Dengan Validasi

```html
<app-form-date-picker
  formControlName="requiredDate"
  label="Tanggal Wajib"
  [showError]="isFieldInvalid('requiredDate')"
  [errorMessage]="getErrorMessage('requiredDate')"
  [required]="true">
</app-form-date-picker>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | `''` | Label untuk input field |
| `labelColor` | string | `'primary'` | Warna label (Ionic color) |
| `labelPosition` | string | `'stacked'` | Posisi label: `stacked`, `floating`, `fixed` |
| `required` | boolean | `false` | Tanda field wajib diisi |
| `placeholder` | string | `'Pilih tanggal'` | Placeholder text |
| `helperText` | string | `''` | Teks bantuan di bawah input |
| `showError` | boolean | `false` | Menampilkan error state |
| `errorMessage` | string | `''` | Pesan error yang ditampilkan |
| `locale` | string | `'id-ID'` | Locale untuk format tanggal |
| `minDate` | string | `undefined` | Tanggal minimum (YYYY-MM-DD) |
| `maxDate` | string | `undefined` | Tanggal maksimum (YYYY-MM-DD) |
| `disabled` | boolean | `false` | Disable input |
| `clearable` | boolean | `false` | Tampilkan tombol hapus |
| `presentation` | string | `'date'` | Tipe presentasi: `date`, `date-time`, `time`, `month-year`, dll |
| `firstDayOfWeek` | number | `0` | Hari pertama minggu (0=Minggu, 1=Senin, ...) |
| `dateFormatOptions` | Intl.DateTimeFormatOptions | `{day: 'numeric', month: 'short', year: 'numeric'}` | Format tampilan tanggal |
| `border` | boolean | `true` | Tampilkan border |
| `borderRadius` | string | `'8px'` | Border radius |
| `borderColor` | string | `var(--ion-color-medium-shade)` | Warna border |
| `focusColor` | string | `var(--ion-color-primary)` | Warna saat focus |
| `errorColor` | string | `var(--ion-color-danger)` | Warna error |
| `bgColor` | string | `var(--ion-background-color)` | Warna background |
| `padding` | string | `'12px 16px'` | Padding input |

## Format Tanggal

`dateFormatOptions` menggunakan `Intl.DateTimeFormatOptions` dari JavaScript:

```typescript
// Format: 15 Jan 2024
{ day: 'numeric', month: 'short', year: 'numeric' }

// Format: 15 Januari 2024
{ day: 'numeric', month: 'long', year: 'numeric' }

// Format: 15/01/2024
{ day: '2-digit', month: '2-digit', year: 'numeric' }

// Format: Senin, 15 Jan 2024
{ weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }
```

## Contoh Implementasi Lengkap

```typescript
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-example-page',
  templateUrl: './example.page.html',
})
export class ExamplePage implements OnInit {
  form: FormGroup;

  ngOnInit() {
    this.form = new FormGroup({
      tanggalLahir: new FormControl('', Validators.required),
      tanggalMulai: new FormControl('', Validators.required),
      tanggalSelesai: new FormControl(''),
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return 'Field ini wajib diisi';
      }
    }
    return '';
  }

  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
      // Output dalam format ISO 8601: { tanggalLahir: '1990-01-15', ... }
    }
  }
}
```

```html
<ion-content>
  <form [formGroup]="form">
    <ion-list>
      <app-form-date-picker
        formControlName="tanggalLahir"
        label="Tanggal Lahir"
        placeholder="Pilih tanggal lahir"
        locale="id-ID"
        [showError]="isFieldInvalid('tanggalLahir')"
        [errorMessage]="getErrorMessage('tanggalLahir')"
        [required]="true">
      </app-form-date-picker>

      <app-form-date-picker
        formControlName="tanggalMulai"
        label="Tanggal Mulai"
        minDate="2024-01-01"
        [showError]="isFieldInvalid('tanggalMulai')"
        [errorMessage]="getErrorMessage('tanggalMulai')"
        [required]="true">
      </app-form-date-picker>

      <app-form-date-picker
        formControlName="tanggalSelesai"
        label="Tanggal Selesai"
        placeholder="Opsional"
        [clearable]="true">
      </app-form-date-picker>
    </ion-list>
  </form>
</ion-content>
```

## Catatan

- Komponen ini menggunakan format ISO 8601 (`YYYY-MM-DD`) untuk value
- Modal datetime picker menggunakan komponen bawaan Ionic Framework
- Untuk styling lebih lanjut, lihat dokumentasi [ion-datetime](https://ionicframework.com/docs/api/datetime) dan [ion-datetime-button](https://ionicframework.com/docs/api/datetime-button)
