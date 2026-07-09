import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ResidentsService } from '../residents.service';
import { HouseBlocksService } from '@features/admin/house-blocks/house-blocks.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { getErrorMessage } from '@validators/validators';
import {
  Resident,
  CreateResidentDto,
  UpdateResidentDto,
  Gender,
  MaritalStatus,
  OwnershipType
} from '../residents.model';
import { HouseBlock } from '@features/admin/house-blocks/house-blocks.model';

// Form control components
import {
  FormInputComponent,
  FormSelectComponent,
  FormTextareaComponent,
  FormButtonComponent,
  SelectOption
} from '@shared/ui/form-controls';

/**
 * Resident Form Page
 * Handles both create and edit modes based on route parameter presence
 */
@Component({
  selector: 'app-resident-form',
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
  templateUrl: './resident-form.page.html',
  styleUrls: ['./resident-form.page.scss']
})
export class ResidentFormPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private residentsService = inject(ResidentsService);
  private houseBlocksService = inject(HouseBlocksService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  // Form and state
  residentForm: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  residentId: string | null = null;

  // Available house blocks
  houseBlocks: HouseBlock[] = [];

  // House block options for select dropdown
  houseBlockOptions: SelectOption[] = [];

  // Enum options
  genderOptions: SelectOption[] = [
    { value: Gender.MALE, label: 'Laki-laki' },
    { value: Gender.FEMALE, label: 'Perempuan' },
    { value: Gender.OTHER, label: 'Lainnya' }
  ];

  maritalStatusOptions: SelectOption[] = [
    { value: MaritalStatus.SINGLE, label: 'Belum Menikah' },
    { value: MaritalStatus.MARRIED, label: 'Menikah' },
    { value: MaritalStatus.DIVORCED, label: 'Cerai' },
    { value: MaritalStatus.WIDOWED, label: 'Janda/Duda' }
  ];

  ownershipTypeOptions: SelectOption[] = [
    { value: OwnershipType.OWNER, label: 'Pemilik' },
    { value: OwnershipType.RENTER, label: 'Penyewa' }
  ];

  private subscriptions: Subscription[] = [];

  constructor() {
    this.residentForm = this.initializeForm();
  }

  ngOnInit(): void {
    this.loadHouseBlocks();

    // Check if we're in edit mode by checking for :id parameter
    this.subscriptions.push(
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.residentId = id;
          this.loadResident(id);
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
      residentCode: [
        '',
        [Validators.required, Validators.maxLength(20)]
      ],
      firstName: [
        '',
        [Validators.required, Validators.maxLength(100)]
      ],
      lastName: [
        '',
        [Validators.required, Validators.maxLength(100)]
      ],
      email: [
        '',
        [Validators.email]
      ],
      phoneNumber: [''],
      alternatePhone: [''],
      identityNumber: [''],
      dateOfBirth: [''],
      gender: [''],
      occupation: [
        '',
        [Validators.maxLength(100)]
      ],
      maritalStatus: [''],
      address: [
        '',
        [Validators.maxLength(255)]
      ],
      emergencyContact: [
        '',
        [Validators.maxLength(100)]
      ],
      emergencyPhone: [''],
      houseBlockId: [
        '',
        [Validators.required]
      ],
      unitNumber: [
        '',
        [Validators.required, Validators.maxLength(20)]
      ],
      moveInDate: [''],
      moveOutDate: [''],
      ownershipType: [
        OwnershipType.OWNER,
        [Validators.required]
      ],
      isActive: [true],
      notes: ['']
    });
  }

  /**
   * Load available house blocks
   */
  private loadHouseBlocks(): void {
    this.subscriptions.push(
      this.houseBlocksService.getAll({ limit: 100 }).subscribe({
        next: (response) => {
          this.houseBlocks = response.data || [];
          // Convert to SelectOption format
          this.houseBlockOptions = this.houseBlocks.map(block => ({
            value: block.id,
            label: `${block.blockName} (${block.blockCode})`
          }));
        },
        error: (error) => {
          console.error('Error loading house blocks:', error);
          this.toastService.error('Gagal memuat blok rumah');
        }
      })
    );
  }

  /**
   * Load existing resident for edit
   */
  private loadResident(id: string): void {
    this.loadingService.show({ message: 'Memuat warga...' });

    this.subscriptions.push(
      this.residentsService.getById(id).subscribe({
        next: (resident) => {
          this.loadingService.dismiss();
          if (resident) {
            this.populateForm(resident);
          } else {
            this.toastService.error('Warga tidak ditemukan');
            this.goBack();
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Gagal memuat warga');
          console.error('Load resident error:', error);
          this.goBack();
        }
      })
    );
  }

  /**
   * Populate form with existing data
   */
  private populateForm(resident: Resident): void {
    this.residentForm.patchValue({
      residentCode: resident.residentCode,
      firstName: resident.firstName,
      lastName: resident.lastName,
      email: resident.email || '',
      phoneNumber: resident.phoneNumber || '',
      alternatePhone: resident.alternatePhone || '',
      identityNumber: resident.identityNumber || '',
      dateOfBirth: resident.dateOfBirth || '',
      gender: resident.gender || '',
      occupation: resident.occupation || '',
      maritalStatus: resident.maritalStatus || '',
      address: resident.address || '',
      emergencyContact: resident.emergencyContact || '',
      emergencyPhone: resident.emergencyPhone || '',
      houseBlockId: resident.houseBlockId,
      unitNumber: resident.unitNumber,
      moveInDate: resident.moveInDate || '',
      moveOutDate: resident.moveOutDate || '',
      ownershipType: resident.ownershipType,
      isActive: resident.isActive ?? true,
      notes: resident.notes || ''
    });
  }

  /**
   * Get form controls
   */
  get f(): { [key: string]: AbstractControl } {
    return this.residentForm.controls;
  }

  /**
   * Get error message for a form field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.residentForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const fieldLabels: { [key: string]: string } = {
      residentCode: 'Kode warga',
      firstName: 'Nama depan',
      lastName: 'Nama belakang',
      email: 'Email',
      phoneNumber: 'Nomor telepon',
      identityNumber: 'Nomor identitas',
      dateOfBirth: 'Tanggal lahir',
      gender: 'Jenis kelamin',
      occupation: 'Pekerjaan',
      maritalStatus: 'Status perkawinan',
      address: 'Alamat',
      emergencyContact: 'Kontak darurat',
      emergencyPhone: 'Telepon darurat',
      houseBlockId: 'Blok rumah',
      unitNumber: 'Nomor unit',
      moveInDate: 'Tanggal masuk',
      moveOutDate: 'Tanggal keluar',
      ownershipType: 'Tipe kepemilikan',
      notes: 'Catatan'
    };

    return getErrorMessage(control.errors, fieldLabels[fieldName] || fieldName);
  }

  /**
   * Check if a field is invalid and touched
   * Used to show validation errors in form-control components
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.residentForm.get(fieldName);
    return control ? control.invalid && control.touched : false;
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.residentForm.valid && !this.isSubmitting;
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.f).forEach((key) => {
        this.f[key].markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.residentForm.value;

    // Build DTO from form values
    const dto = this.buildDto(formValue);

    try {
      await this.loadingService.show({
        message: this.isEditMode ? 'Menyimpan warga...' : 'Membuat warga...'
      });

      if (this.isEditMode && this.residentId) {
        // Update existing
        this.subscriptions.push(
          this.residentsService.update(this.residentId, dto).subscribe({
            next: () => {
              this.loadingService.dismiss();
              this.toastService.success('Warga berhasil disimpan!');
              this.goBack();
            },
            error: (error) => {
              this.loadingService.dismiss();
              this.isSubmitting = false;
              this.toastService.error('Gagal menyimpan warga');
              console.error('Update resident error:', error);
            }
          })
        );
      } else {
        // Create new
        this.subscriptions.push(
          this.residentsService.create(dto as CreateResidentDto).subscribe({
            next: () => {
              this.loadingService.dismiss();
              this.toastService.success('Warga berhasil dibuat!');
              this.goBack();
            },
            error: (error) => {
              this.loadingService.dismiss();
              this.isSubmitting = false;
              this.toastService.error('Gagal membuat warga');
              console.error('Create resident error:', error);
            }
          })
        );
      }
    } catch (error) {
      this.loadingService.dismiss();
      this.isSubmitting = false;
      this.toastService.error('Terjadi kesalahan');
      console.error('Submit error:', error);
    }
  }

  /**
   * Build DTO from form values
   */
  private buildDto(formValue: any): CreateResidentDto | UpdateResidentDto {
    const dto: any = {
      residentCode: formValue.residentCode?.trim(),
      firstName: formValue.firstName?.trim(),
      lastName: formValue.lastName?.trim(),
      houseBlockId: formValue.houseBlockId,
      unitNumber: formValue.unitNumber?.trim(),
      ownershipType: formValue.ownershipType,
      isActive: formValue.isActive ?? true
    };

    // Optional fields
    if (formValue.email?.trim()) {
      dto.email = formValue.email.trim();
    }
    if (formValue.phoneNumber?.trim()) {
      dto.phoneNumber = formValue.phoneNumber.trim();
    }
    if (formValue.alternatePhone?.trim()) {
      dto.alternatePhone = formValue.alternatePhone.trim();
    }
    if (formValue.identityNumber?.trim()) {
      dto.identityNumber = formValue.identityNumber.trim();
    }
    if (formValue.dateOfBirth) {
      dto.dateOfBirth = this.toLocalIsoString(formValue.dateOfBirth);
    }
    if (formValue.gender) {
      dto.gender = formValue.gender;
    }
    if (formValue.occupation?.trim()) {
      dto.occupation = formValue.occupation.trim();
    }
    if (formValue.maritalStatus) {
      dto.maritalStatus = formValue.maritalStatus;
    }
    if (formValue.address?.trim()) {
      dto.address = formValue.address.trim();
    }
    if (formValue.emergencyContact?.trim()) {
      dto.emergencyContact = formValue.emergencyContact.trim();
    }
    if (formValue.emergencyPhone?.trim()) {
      dto.emergencyPhone = formValue.emergencyPhone.trim();
    }
    if (formValue.moveInDate) {
      dto.moveInDate = this.toLocalIsoString(formValue.moveInDate);
    }
    if (formValue.moveOutDate) {
      dto.moveOutDate = this.toLocalIsoString(formValue.moveOutDate);
    }
    if (formValue.notes?.trim()) {
      dto.notes = formValue.notes.trim();
    }

    return dto;
  }

  /**
   * Convert date string to ISO format with time at 00:00:00 (local time)
   * Prevents timezone conversion issues
   */
  private toLocalIsoString(dateValue: string): string {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  /**
   * Navigate back to list
   */
  goBack(): void {
    this.router.navigate(['/admin/residents']);
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return this.isEditMode ? 'Edit Warga' : 'Buat Warga';
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return this.isEditMode ? 'Simpan' : 'Buat';
  }

  /**
   * Get house block name by ID
   */
  getHouseBlockName(blockId: string): string {
    const block = this.houseBlocks.find(b => b.id === blockId);
    return block ? `${block.blockName} (${block.blockCode})` : 'Unknown';
  }
}
