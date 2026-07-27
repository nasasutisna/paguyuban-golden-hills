import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { UsersService } from '../users.service';
import { LoadingService } from '@services/loading.service';
import { ToastService } from '@services/toast.service';
import { User } from '../users.model';
import { ResetPasswordModalComponent } from '../reset-password-modal/reset-password-modal.component';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './user-detail.page.html',
  styleUrls: ['./user-detail.page.scss'],
})
export class UserDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private modalController = inject(ModalController);

  user: User | null = null;
  loading = true;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.subscriptions.push(
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.loadUser(id);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private loadUser(id: string): void {
    this.loading = true;
    this.loadingService.show({ message: 'Memuat pengguna...' });
    this.subscriptions.push(
      this.usersService.getById(id).subscribe({
        next: (user) => {
          this.loadingService.dismiss();
          this.user = user;
          this.loading = false;
          if (!user) {
            this.toastService.error('Pengguna tidak ditemukan');
            this.goBack();
          }
        },
        error: (err) => {
          this.loadingService.dismiss();
          console.error('Load user error:', err);
          this.toastService.error('Gagal memuat pengguna');
          this.loading = false;
        },
      }),
    );
  }

  navigateToEdit(): void {
    if (this.user) {
      this.router.navigate(['/admin/users', this.user.id, 'edit']);
    }
  }

  async openResetPassword(): Promise<void> {
    if (!this.user) return;
    const modal = await this.modalController.create({
      component: ResetPasswordModalComponent,
      componentProps: { user: this.user },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      // password changed — reload to reflect nothing sensitive, but keep fresh
      if (this.user) this.loadUser(this.user.id);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  get fullName(): string {
    return this.user ? `${this.user.firstName} ${this.user.lastName}`.trim() : '';
  }

  get residentLabel(): string {
    const r = this.user?.resident;
    if (!r) return '(tidak terhubung)';
    const block = r.houseBlock?.blockName || r.houseBlock?.blockCode;
    return `${r.firstName} ${r.lastName}${r.residentCode ? ' (' + r.residentCode + ')' : ''}${block ? ' • ' + block : ''}`;
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
