import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { UsersService } from '../users.service';
import { ToastService } from '@services/toast.service';
import { LoadingService } from '@services/loading.service';
import {
  getErrorMessage,
  strongPassword,
  validUsername,
} from '@validators/validators';
import {
  User,
  Role,
  CreateUserDto,
  UpdateUserDto,
  UserResidentReference,
  PasswordMode,
} from '../users.model';
import { Resident } from '@features/admin/residents/residents.model';
import { SelectOption } from '@shared/ui/form-controls';
import {
  FormInputComponent,
  FormSelectComponent,
  FormButtonComponent,
} from '@shared/ui/form-controls';
import { ResidentPickerModalComponent } from '../resident-picker-modal/resident-picker-modal.component';
import { ResetPasswordModalComponent } from '../reset-password-modal/reset-password-modal.component';

/**
 * User Form Page (create / edit).
 * - Pick a resident (modal search) → auto-fills identity fields.
 * - Assign a role.
 * - On create: set password (manual) or generate + send via WhatsApp.
 * - On edit: change role/name/phone/linked-resident; password via reset modal.
 */
@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormInputComponent,
    FormSelectComponent,
    FormButtonComponent,
  ],
  templateUrl: './user-form.page.html',
  styleUrls: ['./user-form.page.scss'],
})
export class UserFormPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private modalController = inject(ModalController);
  private alertController = inject(AlertController);

  form!: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  userId: string | null = null;
  loadedUser: User | null = null;

  roles: Role[] = [];
  roleOptions: SelectOption[] = [];
  selectedResident: UserResidentReference | Resident | null = null;

  passwordModeOptions: SelectOption[] = [
    { value: 'generate', label: 'Generate otomatis (disarankan)' },
    { value: 'manual', label: 'Set manual' },
  ];

  private subscriptions: Subscription[] = [];

  constructor() {
    this.form = this.initializeForm();
  }

  ngOnInit(): void {
    this.loadRoles();

    // React to password-mode changes (clear manual password when switching to generate)
    this.subscriptions.push(
      this.form.get('passwordMode')!.valueChanges.subscribe(() => this.onPasswordModeChange()),
    );

    this.subscriptions.push(
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.userId = id;
          this.form.get('username')?.disable();
          this.form.get('email')?.disable();
          this.loadUser(id);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private initializeForm(): FormGroup {
    return this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), validUsername()]],
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      phoneNumber: [''],
      roleId: ['', [Validators.required]],
      isActive: [true],
      residentId: [null as string | null],
      // Password (create only)
      passwordMode: ['generate' as PasswordMode],
      password: ['', [Validators.minLength(8)]],
      sendViaWhatsapp: [true],
    });
  }

  private loadRoles(): void {
    this.subscriptions.push(
      this.usersService.getRoles().subscribe({
        next: (roles) => {
          this.roles = roles;
          this.roleOptions = roles.map((r) => ({
            value: r.id,
            label: `${r.name}${r.description ? ' — ' + r.description : ''}`,
          }));
        },
        error: (err) => {
          console.error('Error loading roles:', err);
          this.toastService.error('Gagal memuat daftar role');
        },
      }),
    );
  }

  private loadUser(id: string): void {
    this.loadingService.show({ message: 'Memuat pengguna...' });
    this.subscriptions.push(
      this.usersService.getById(id).subscribe({
        next: (user) => {
          this.loadingService.dismiss();
          if (!user) {
            this.toastService.error('Pengguna tidak ditemukan');
            this.goBack();
            return;
          }
          this.loadedUser = user;
          this.selectedResident = user.resident ?? null;
          this.form.patchValue({
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber || '',
            roleId: user.roleId,
            isActive: user.isActive,
            residentId: user.resident?.id ?? null,
          });
        },
        error: (err) => {
          this.loadingService.dismiss();
          console.error('Load user error:', err);
          this.toastService.error('Gagal memuat pengguna');
          this.goBack();
        },
      }),
    );
  }

  get f(): { [key: string]: AbstractControl } {
    return this.form.controls;
  }

  get passwordMode(): PasswordMode {
    return this.form.value.passwordMode;
  }

  get phonePreview(): string {
    const r = this.selectedResident as any;
    return r?.phoneNumber || this.form.value.phoneNumber || '(belum ada)';
  }

  /** Phone of the currently selected resident (for template use — no `as any` in template) */
  get selectedResidentPhone(): string {
    const r = this.selectedResident as any;
    return r?.phoneNumber || '';
  }

  isFieldInvalid(field: string): boolean {
    const c = this.form.get(field);
    return c ? c.invalid && c.touched : false;
  }

  getErrorMessage(field: string): string {
    const c = this.form.get(field);
    if (!c || !c.errors || !c.touched) return '';
    const labels: Record<string, string> = {
      username: 'Username',
      email: 'Email',
      firstName: 'Nama depan',
      lastName: 'Nama belakang',
      phoneNumber: 'Nomor telepon',
      roleId: 'Role',
    };
    return getErrorMessage(c.errors, labels[field] || field);
  }

  /** Open the resident picker modal and auto-fill identity on selection */
  async openResidentPicker(): Promise<void> {
    const modal = await this.modalController.create({
      component: ResidentPickerModalComponent,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.selectedResident = data as Resident;
      const patch: any = { residentId: data.id };
      if (!this.isEditMode) {
        // Auto-fill identity on create
        patch.firstName = data.firstName;
        patch.lastName = data.lastName;
        patch.phoneNumber = data.phoneNumber || '';
        if (data.email) patch.email = data.email;
        const derived = this.deriveUsername(data);
        if (derived) patch.username = derived;
      }
      this.form.patchValue(patch);
    }
  }

  clearResident(): void {
    this.selectedResident = null;
    this.form.patchValue({ residentId: null });
  }

  private deriveUsername(r: Resident): string {
    if (r.email) {
      return r.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '');
    }
    const base = `${r.firstName}${r.lastName ? '.' + r.lastName : ''}`
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '');
    return base;
  }

  onPasswordModeChange(): void {
    if (this.passwordMode === 'generate') {
      this.form.get('password')?.reset('');
    }
  }

  /** Edit mode: open reset password modal */
  async openResetPassword(): Promise<void> {
    if (!this.loadedUser) return;
    const modal = await this.modalController.create({
      component: ResetPasswordModalComponent,
      componentProps: { user: this.loadedUser },
    });
    await modal.present();
  }

  isFormValid(): boolean {
    if (this.form.invalid) return false;
    if (!this.isEditMode) {
      if (this.passwordMode === 'manual') {
        const pw = this.form.get('password');
        if (!pw?.value || strongPassword()(pw as AbstractControl)) {
          return false;
        }
      }
    }
    return !this.isSubmitting;
  }

  async onSubmit(): Promise<void> {
    // Re-validate password strength on manual create
    if (!this.isEditMode && this.passwordMode === 'manual') {
      const pw = this.form.get('password');
      if (!pw?.value) {
        pw?.setErrors({ required: true });
      } else {
        const err = strongPassword()(pw as AbstractControl);
        if (err) pw.setErrors(err);
      }
    }

    if (this.form.invalid) {
      Object.values(this.f).forEach((c) => c.markAsTouched());
      return;
    }

    this.isSubmitting = true;
    await this.loadingService.show({
      message: this.isEditMode ? 'Menyimpan pengguna...' : 'Membuat pengguna...',
    });

    if (this.isEditMode && this.userId) {
      const dto: UpdateUserDto = {
        firstName: this.form.value.firstName?.trim(),
        lastName: this.form.value.lastName?.trim(),
        phoneNumber: this.form.value.phoneNumber?.trim() || undefined,
        roleId: this.form.value.roleId,
        isActive: this.form.value.isActive ?? true,
        residentId: this.form.value.residentId ?? null,
      };
      this.subscriptions.push(
        this.usersService.update(this.userId, dto).subscribe({
          next: () => {
            this.loadingService.dismiss();
            this.toastService.success('Pengguna berhasil disimpan!');
            this.goBack();
          },
          error: (err) => this.handleCreateUpdateError(err),
        }),
      );
    } else {
      const v = this.form.value;
      const dto: CreateUserDto = {
        username: v.username?.trim(),
        email: v.email?.trim(),
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        phoneNumber: v.phoneNumber?.trim() || undefined,
        roleId: v.roleId,
        isActive: v.isActive ?? true,
        residentId: v.residentId || undefined,
        passwordMode: v.passwordMode,
        ...(v.passwordMode === 'manual' ? { password: v.password } : {}),
        sendViaWhatsapp: !!v.sendViaWhatsapp,
      };
      this.subscriptions.push(
        this.usersService.create(dto).subscribe({
          next: (created) => {
            this.loadingService.dismiss();
            this.isSubmitting = false;
            this.toastService.success('Pengguna berhasil dibuat!');
            if (created.generatedPassword) {
              this.showGeneratedPassword(created.generatedPassword, created.whatsappSent ?? false);
            } else {
              this.goBack();
            }
          },
          error: (err) => this.handleCreateUpdateError(err),
        }),
      );
    }
  }

  private handleCreateUpdateError(err: any): void {
    this.loadingService.dismiss();
    this.isSubmitting = false;
    console.error('Submit user error:', err);
    const apiMsg = err?.error?.message || err?.message;
    this.toastService.error(apiMsg || 'Gagal menyimpan pengguna');
  }

  private async showGeneratedPassword(password: string, whatsappSent: boolean): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Password Generated',
      message:
        `Password untuk pengguna baru:<br><br>` +
        `<strong style="font-size:18px;letter-spacing:1px;">${password}</strong><br><br>` +
        (whatsappSent
          ? 'Password juga dikirim via WhatsApp ke warga.'
          : 'Salin password ini sekarang — tidak akan ditampilkan lagi.'),
      buttons: [
        {
          text: 'Salin & Tutup',
          handler: async () => {
            try {
              await navigator.clipboard.writeText(password);
              this.toastService.success('Password disalin');
            } catch {
              /* ignore */
            }
            this.goBack();
          },
        },
        {
          text: 'Tutup',
          role: 'cancel',
          handler: () => this.goBack(),
        },
      ],
    });
    await alert.present();
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Pengguna' : 'Buat Pengguna';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Simpan' : 'Buat';
  }

  getResidentLabel(): string {
    const r = this.selectedResident as any;
    if (!r) return '';
    const block = r.houseBlock?.blockName || r.houseBlock?.blockCode;
    return `${r.firstName} ${r.lastName}${r.residentCode ? ' (' + r.residentCode + ')' : ''}${block ? ' • ' + block : ''}`;
  }
}
