import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  FormControl
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription, switchMap } from 'rxjs';
import { HouseBlocksService } from '../house-blocks.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import { getErrorMessage } from '@validators/validators';
import { HouseBlock, CreateHouseBlockDto, UpdateHouseBlockDto, BlockType } from '../house-blocks.model';

// Form control components
import {
  FormInputComponent,
  FormSelectComponent,
  FormTextareaComponent,
  FormButtonComponent,
  SelectOption
} from '@shared/ui/form-controls';

/**
 * House Block Form Page
 * Handles both create and edit modes based on route parameter presence
 */
@Component({
  selector: 'app-house-block-form',
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
  templateUrl: './house-block-form.page.html',
  styleUrls: ['./house-block-form.page.scss']
})
export class HouseBlockFormPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private houseBlocksService = inject(HouseBlocksService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);

  // Form and state
  houseBlockForm: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  houseBlockId: string | null = null;

  // Block type options
  blockTypeOptions = [
    { value: BlockType.RESIDENTIAL, label: 'Residential' },
    { value: BlockType.COMMERCIAL, label: 'Commercial' },
    { value: BlockType.MIXED, label: 'Mixed Use' }
  ];

  // Current year for validation
  currentYear = new Date().getFullYear();

  private subscriptions: Subscription[] = [];

  constructor() {
    this.houseBlockForm = this.initializeForm();
  }

  ngOnInit(): void {
    // Check if we're in edit mode by checking for :id parameter
    this.subscriptions.push(
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.houseBlockId = id;
          this.loadHouseBlock(id);
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
      blockCode: [
        '',
        [Validators.required, Validators.maxLength(20)]
      ],
      blockName: [
        '',
        [Validators.required, Validators.maxLength(100)]
      ],
      blockType: [
        BlockType.RESIDENTIAL,
        [Validators.required]
      ],
      address: [
        '',
        [Validators.maxLength(255)]
      ],
      totalUnits: [
        0,
        [Validators.required, Validators.min(0)]
      ],
      totalFloors: [
        '',
        [Validators.min(1)]
      ],
      constructionYear: [
        '',
        [Validators.min(1900), Validators.max(this.currentYear + 1)]
      ],
      landArea: [
        '',
        [Validators.min(0)]
      ],
      buildingArea: [
        '',
        [Validators.min(0)]
      ],
      facilities: [''],
      amenities: [''],
      isActive: [true],
      description: ['']
    });
  }

  /**
   * Load existing house block for edit
   */
  private loadHouseBlock(id: string): void {
    this.loadingService.show({ message: 'Loading house block...' });

    this.subscriptions.push(
      this.houseBlocksService.getById(id).subscribe({
        next: (houseBlock) => {
          this.loadingService.dismiss();
          if (houseBlock) {
            this.populateForm(houseBlock);
          } else {
            this.toastService.error('House block not found');
            this.goBack();
          }
        },
        error: (error) => {
          this.loadingService.dismiss();
          this.toastService.error('Failed to load house block');
          console.error('Load house block error:', error);
          this.goBack();
        }
      })
    );
  }

  /**
   * Populate form with existing data
   */
  private populateForm(houseBlock: HouseBlock): void {
    this.houseBlockForm.patchValue({
      blockCode: houseBlock.blockCode,
      blockName: houseBlock.blockName,
      blockType: houseBlock.blockType,
      address: houseBlock.address || '',
      totalUnits: houseBlock.totalUnits,
      totalFloors: houseBlock.totalFloors || '',
      constructionYear: houseBlock.constructionYear || '',
      facilities: houseBlock.facilities || '',
      amenities: houseBlock.amenities || '',
      isActive: houseBlock.isActive ?? true,
      description: houseBlock.description || ''
    });
  }

  /**
   * Get form controls
   */
  get f(): { [key: string]: AbstractControl } {
    return this.houseBlockForm.controls;
  }

  /**
   * Get error message for a form field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.houseBlockForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const fieldLabels: { [key: string]: string } = {
      blockCode: 'Block code',
      blockName: 'Block name',
      blockType: 'Block type',
      address: 'Address',
      totalUnits: 'Total units',
      totalFloors: 'Total floors',
      constructionYear: 'Construction year',
      facilities: 'Facilities',
      amenities: 'Amenities',
      description: 'Description',
      landArea: 'Land area',
      buildingArea: 'Building area'
    };

    return getErrorMessage(control.errors, fieldLabels[fieldName] || fieldName);
  }

  /**
   * Check if a field is invalid and touched
   * Used to show validation errors in form-control components
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.houseBlockForm.get(fieldName);
    return control ? control.invalid && control.touched : false;
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.houseBlockForm.valid && !this.isSubmitting;
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
    const formValue = this.houseBlockForm.value;

    // Build DTO from form values
    const dto = this.buildDto(formValue);

    try {
      await this.loadingService.show({
        message: this.isEditMode ? 'Updating house block...' : 'Creating house block...'
      });

      if (this.isEditMode && this.houseBlockId) {
        // Update existing
        this.subscriptions.push(
          this.houseBlocksService.update(this.houseBlockId, dto).subscribe({
            next: () => {
              this.loadingService.dismiss();
              this.toastService.success('House block updated successfully!');
              this.goBack();
            },
            error: (error) => {
              this.loadingService.dismiss();
              this.isSubmitting = false;
              this.toastService.error('Failed to update house block');
              console.error('Update house block error:', error);
            }
          })
        );
      } else {
        // Create new
        this.subscriptions.push(
          this.houseBlocksService.create(dto as CreateHouseBlockDto).subscribe({
            next: () => {
              this.loadingService.dismiss();
              this.toastService.success('House block created successfully!');
              this.goBack();
            },
            error: (error) => {
              this.loadingService.dismiss();
              this.isSubmitting = false;
              this.toastService.error('Failed to create house block');
              console.error('Create house block error:', error);
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
  private buildDto(formValue: any): CreateHouseBlockDto | UpdateHouseBlockDto {
    const dto: any = {
      blockCode: formValue.blockCode?.trim(),
      blockName: formValue.blockName?.trim(),
      blockType: formValue.blockType,
      totalUnits: Number(formValue.totalUnits) || 0,
      isActive: formValue.isActive ?? true
    };

    // Optional fields
    if (formValue.address?.trim()) {
      dto.address = formValue.address.trim();
    }
    if (formValue.totalFloors) {
      dto.totalFloors = Number(formValue.totalFloors);
    }
    if (formValue.constructionYear) {
      dto.constructionYear = Number(formValue.constructionYear);
    }
    if (formValue.landArea) {
      dto.landArea = Number(formValue.landArea);
    }
    if (formValue.buildingArea) {
      dto.buildingArea = Number(formValue.buildingArea);
    }
    if (formValue.facilities?.trim()) {
      dto.facilities = formValue.facilities.trim();
    }
    if (formValue.amenities?.trim()) {
      dto.amenities = formValue.amenities.trim();
    }
    if (formValue.description?.trim()) {
      dto.description = formValue.description.trim();
    }

    return dto;
  }

  /**
   * Navigate back to list
   */
  goBack(): void {
    this.router.navigate(['/admin/house-blocks']);
  }

  /**
   * Get page title
   */
  get pageTitle(): string {
    return this.isEditMode ? 'Edit House Block' : 'Create House Block';
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return this.isEditMode ? 'Update' : 'Create';
  }
}
