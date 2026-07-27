import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { IonicModule, ModalController, SearchbarCustomEvent } from '@ionic/angular';
import { ResidentsService } from '@features/admin/residents/residents.service';
import { Resident } from '@features/admin/residents/residents.model';

/**
 * Modal picker to search and select a resident (server-side search).
 * Dismisses with the selected Resident, or undefined on cancel.
 */
@Component({
  selector: 'app-resident-picker-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './resident-picker-modal.component.html',
  styleUrls: ['./resident-picker-modal.component.scss'],
})
export class ResidentPickerModalComponent implements OnInit {
  private modalController = inject(ModalController);
  private residentsService = inject(ResidentsService);

  residents: Resident[] = [];
  loading = false;
  searchQuery = '';
  private searchTimer: any;

  ngOnInit(): void {
    this.search('');
  }

  onSearch(event: SearchbarCustomEvent): void {
    this.searchQuery = event.detail.value ?? '';
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.search(this.searchQuery.trim()), 300);
  }

  private search(query: string): void {
    this.loading = true;
    this.residentsService
      .getAll({
        page: 1,
        limit: 25,
        ...(query ? { search: query } : {}),
      })
      .subscribe({
        next: (response) => {
          this.residents = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error searching residents:', error);
          this.residents = [];
          this.loading = false;
        },
      });
  }

  select(resident: Resident): void {
    this.modalController.dismiss(resident);
  }

  cancel(): void {
    this.modalController.dismiss();
  }

  getResidentName(r: Resident): string {
    return `${r.firstName} ${r.lastName}`.trim();
  }
}
