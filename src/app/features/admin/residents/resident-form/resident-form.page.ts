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

/**
 * Resident Form Page
 * Handles both create and edit modes based on route parameter presence
 */
@Component({
  selector: 'app-resident-form',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
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

  // Enum options
  genderOptions = [
    { value: Gender.MALE, label: 'Male' },
    { value: Gender.FEMALE, label: 'Female' },
    { value: Gender.OTHER, label: 'Other' }
  ];

  maritalStatusOptions = [
    { value: MaritalStatus.SINGLE, label: 'Single' },
    { value: MaritalStatus.MARRIED, label: 'Married' },
    { value: MaritalStatus.DIVORCED, label: 'Divorced' },
    { value: MaritalStatus.WIDOWED, label: 'Widowed' }
  ];

  ownershipTypeOptions = [
    { value: OwnershipType.OWNER, label: 'Owner' },
    { value: OwnershipType.RENTER, label: 'Renter' }
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
        },
        error: (error) => {
          console.error('Error loading house blocks:', error);
          this.toastService.error('Failed to load house blocks');
        }
      })
    );
  }

  /**
   * Load existing resident for edit
   */
  private loadResident(id: string): void {
    this.loadingService.show({ message: 'Loading resident...' });

    this.subscriptions.push(
      this.residentsService.getById(id).subscribe({
        next: (resident) => {
          this.loadingService.dismiss();
          if (resident) {
            this.populateForm(resident);
          } else {
            this.toastService.error('Resident not found');
            this.goBack();
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Failed to load resident');
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
      residentCode: 'Resident code',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phoneNumber: 'Phone number',
      identityNumber: 'Identity number',
      dateOfBirth: 'Date of birth',
      gender: 'Gender',
      occupation: 'Occupation',
      maritalStatus: 'Marital status',
      address: 'Address',
      emergencyContact: 'Emergency contact',
      emergencyPhone: 'Emergency phone',
      houseBlockId: 'House block',
      unitNumber: 'Unit number',
      moveInDate: 'Move in date',
      moveOutDate: 'Move out date',
      ownershipType: 'Ownership type',
      notes: 'Notes'
    };

    return getErrorMessage(control.errors, fieldLabels[fieldName] || fieldName);
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
        message: this.isEditMode ? 'Updating resident...' : 'Creating resident...'
      });

      if (this.isEditMode && this.residentId) {
        // Update existing
        this.subscriptions.push(
          this.residentsService.update(this.residentId, dto).subscribe({
            next: () => {
              this.loadingService.dismiss();
              this.toastService.success('Resident updated successfully!');
              this.goBack();
            },
            error: (error) => {
              this.loadingService.dismiss();
              this.isSubmitting = false;
              this.toastService.error('Failed to update resident');
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
              this.toastService.success('Resident created successfully!');
              this.goBack();
            },
            error: (error) => {
              this.loadingService.dismiss();
              this.isSubmitting = false;
              this.toastService.error('Failed to create resident');
              console.error('Create resident error:', error);
            }
          })
        );
      }
    } catch (error) {
      this.loadingService.dismiss();
      this.isSubmitting = false;
      this.toastService.error('An error occurred');
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
    return this.isEditMode ? 'Edit Resident' : 'Create Resident';
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return this.isEditMode ? 'Update' : 'Create';
  }

  /**
   * Get house block name by ID
   */
  getHouseBlockName(blockId: string): string {
    const block = this.houseBlocks.find(b => b.id === blockId);
    return block ? `${block.blockName} (${block.blockCode})` : 'Unknown';
  }
}
