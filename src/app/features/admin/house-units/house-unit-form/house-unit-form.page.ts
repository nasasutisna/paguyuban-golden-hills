import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { HouseUnitsService } from '../house-units.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { HouseUnit, CreateHouseUnitDto, UpdateHouseUnitDto, OccupancyStatus, UNIT_TYPE_OPTIONS } from '../house-units.model';
import {
  FormInputComponent,
  FormSelectComponent,
  FormTextareaComponent,
  FormButtonComponent
} from '@shared/ui/form-controls';

/**
 * House Unit Form Page
 * Handles both create and edit modes based on route parameter presence
 */
@Component({
  selector: 'app-house-unit-form',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormInputComponent,
    FormSelectComponent,
    FormTextareaComponent,
    FormButtonComponent
  ],
  templateUrl: './house-unit-form.page.html',
  styleUrls: ['./house-unit-form.page.scss']
})
export class HouseUnitFormPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private houseUnitsService = inject(HouseUnitsService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  // Form and state
  houseUnitForm: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  houseUnitId: string | null = null;

  // Options
  occupancyStatusOptions = [
    { value: OccupancyStatus.FULLY_OCCUPIED, label: 'Ditinggali Penuh (100% IPL)' },
    { value: OccupancyStatus.OCCASIONALLY, label: 'Jarang Ditinggali (50% IPL)' },
    { value: OccupancyStatus.VACANT, label: 'Kosong (0% IPL)' },
    { value: OccupancyStatus.RENTED, label: 'Disewakan (100% IPL)' }
  ];

  unitTypeOptions = UNIT_TYPE_OPTIONS;

  private subscriptions: Subscription[] = [];

  constructor() {
    this.houseUnitForm = this.initializeForm();
  }

  ngOnInit(): void {
    // Check if we're in edit mode by checking for :id parameter
    this.subscriptions.push(
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.houseUnitId = id;
          this.loadHouseUnit(id);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Initialize form with validators
   */
  private initializeForm(): FormGroup {
    return this.fb.group({
      unitCode: ['', [Validators.required, Validators.maxLength(20)]],
      unitNumber: ['', [Validators.required, Validators.maxLength(20)]],
      houseBlockId: ['', Validators.required],
      landArea: ['', [Validators.required, Validators.min(0)]],
      buildingArea: ['', [Validators.required, Validators.min(0)]],
      floorNumber: ['', [Validators.min(1)]],
      unitType: [''],
      occupancyStatus: [OccupancyStatus.VACANT],
      occupancyNotes: [''],
      isBankBuyback: [false],
      iplPercentage: [100, [Validators.min(0), Validators.max(100)]],
      isActive: [true]
    });
  }

  /**
   * Load house unit data for edit mode
   */
  private loadHouseUnit(id: string): void {
    this.loadingService.show({ message: 'Memuat data unit...' });

    this.subscriptions.push(
      this.houseUnitsService.getById(id).subscribe({
        next: (unit) => {
          this.loadingService.dismiss();
          if (unit) {
            this.patchForm(unit);
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal memuat data unit');
          console.error('Error loading house unit:', error);
        }
      })
    );
  }

  /**
   * Patch form with existing data
   */
  private patchForm(unit: HouseUnit): void {
    this.houseUnitForm.patchValue({
      unitCode: unit.unitCode,
      unitNumber: unit.unitNumber,
      houseBlockId: unit.houseBlockId,
      landArea: unit.landArea,
      buildingArea: unit.buildingArea,
      floorNumber: unit.floorNumber,
      unitType: unit.unitType,
      occupancyStatus: unit.occupancyStatus,
      occupancyNotes: unit.occupancyNotes,
      isBankBuyback: unit.isBankBuyback,
      iplPercentage: unit.iplPercentage,
      isActive: unit.isActive
    });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.houseUnitForm.invalid) {
      this.markFormGroupTouched(this.houseUnitForm);
      this.toastService.warning('Mohon lengkapi form dengan benar');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.houseUnitForm.value;

    if (this.isEditMode && this.houseUnitId) {
      this.updateHouseUnit(formValue);
    } else {
      this.createHouseUnit(formValue);
    }
  }

  /**
   * Create new house unit
   */
  private createHouseUnit(dto: CreateHouseUnitDto): void {
    this.loadingService.show({ message: 'Membuat unit...' });

    this.subscriptions.push(
      this.houseUnitsService.create(dto).subscribe({
        next: (unit) => {
          this.loadingService.dismiss();
          if (unit) {
            this.toastService.success('Unit berhasil dibuat');
            this.router.navigate(['/admin/house-units', unit.id]);
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.isSubmitting = false;
          this.toastService.error('Gagal membuat unit');
          console.error('Error creating house unit:', error);
        }
      })
    );
  }

  /**
   * Update existing house unit
   */
  private updateHouseUnit(dto: UpdateHouseUnitDto): void {
    if (!this.houseUnitId) return;

    this.loadingService.show({ message: 'Memperbarui unit...' });

    this.subscriptions.push(
      this.houseUnitsService.update(this.houseUnitId, dto).subscribe({
        next: (unit) => {
          this.loadingService.dismiss();
          if (unit) {
            this.toastService.success('Unit berhasil diperbarui');
            this.router.navigate(['/admin/house-units', unit.id]);
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.isSubmitting = false;
          this.toastService.error('Gagal memperbarui unit');
          console.error('Error updating house unit:', error);
        }
      })
    );
  }

  /**
   * Handle occupancy status change - auto-update IPL percentage
   */
  onOccupancyStatusChange(event: any): void {
    const status = event as OccupancyStatus;
    const iplMap: Record<OccupancyStatus, number> = {
      [OccupancyStatus.FULLY_OCCUPIED]: 100,
      [OccupancyStatus.OCCASIONALLY]: 50,
      [OccupancyStatus.VACANT]: 0,
      [OccupancyStatus.RENTED]: 100
    };
    this.houseUnitForm.patchValue({ iplPercentage: iplMap[status] });
  }

  /**
   * Handle bank buyback toggle
   */
  onBankBuybackChange(isBuyback: boolean): void {
    if (isBuyback) {
      this.houseUnitForm.patchValue({
        buybackDate: new Date().toISOString()
      });
    } else {
      this.houseUnitForm.patchValue({
        buybackDate: null
      });
    }
  }

  /**
   * Cancel and navigate back
   */
  cancel(): void {
    if (this.isEditMode && this.houseUnitId) {
      this.router.navigate(['/admin/house-units', this.houseUnitId]);
    } else {
      this.router.navigate(['/admin/house-units']);
    }
  }

  /**
   * Mark all controls as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();
        if (control instanceof FormGroup) {
          this.markFormGroupTouched(control);
        }
      }
    });
  }

  /**
   * Get page title
   */
  getPageTitle(): string {
    return this.isEditMode ? 'Edit Unit' : 'Tambah Unit Baru';
  }

  /**
   * Get submit button text
   */
  getSubmitButtonText(): string {
    return this.isEditMode ? 'Simpan Perubahan' : 'Buat Unit';
  }

  /**
   * Check if field has error
   */
  hasError(fieldName: string, errorName?: string): boolean {
    const field = this.houseUnitForm.get(fieldName);
    if (!field) return false;

    if (errorName) {
      return field.touched && field.hasError(errorName);
    }
    return field.touched && field.invalid;
  }

  /**
   * Get error message for field
   */
  getErrorMessage(fieldName: string): string {
    const field = this.houseUnitForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return 'Field ini wajib diisi';
    }
    if (field.errors['maxlength']) {
      return `Maksimal ${field.errors['maxlength'].requiredLength} karakter`;
    }
    if (field.errors['min']) {
      return `Minimal nilai ${field.errors['min'].min}`;
    }
    if (field.errors['max']) {
      return `Maksimal nilai ${field.errors['max'].max}`;
    }

    return 'Input tidak valid';
  }
}
