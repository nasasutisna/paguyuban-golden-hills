import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';

/**
 * Card variant types
 */
export type CardVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gradient' | 'nature';

/**
 * Card size
 */
export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Standardized Card Component
 * Reusable card with multiple variants and sizes
 */
@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  // Inputs
  @Input() variant: CardVariant = 'default';
  @Input() size: CardSize = 'md';
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() image?: string;
  @Input() imagePosition: 'top' | 'bottom' = 'top';
  @Input() clickable = false;
  @Input() hoverable = false;
  @Input() bordered = false;
  @Input() elevated = true;
  @Input() loading = false;
  @Input() value?: string | number;
  @Input() trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  @Input() action?: {
    label?: string;
    icon?: string;
  };
  @Input() badge?: {
    text: string;
    color?: string;
  };
  @Input() customClass?: string;

  // Outputs
  @Output() cardClick = new EventEmitter<void>();
  @Output() actionClick = new EventEmitter<Event>();

  /**
   * Handle card click
   */
  onCardClick(): void {
    if (this.clickable) {
      this.cardClick.emit();
    }
  }

  /**
   * Handle action button click
   */
  onAction(event: Event): void {
    event.stopPropagation();
    this.actionClick.emit(event);
  }

  /**
   * Get card wrapper classes
   */
  getCardClasses(): string {
    const classes: string[] = ['app-card'];

    classes.push(`card-${this.variant}`);
    classes.push(`card-${this.size}`);

    if (this.clickable) classes.push('card-clickable');
    if (this.hoverable) classes.push('card-hoverable');
    if (this.bordered) classes.push('card-bordered');
    if (this.elevated) classes.push('card-elevated');
    if (this.loading) classes.push('card-loading');
    if (this.customClass) classes.push(this.customClass);

    return classes.join(' ');
  }

  /**
   * Get trend icon name
   */
  getTrendIcon(): string {
    if (!this.trend) return '';

    switch (this.trend.direction) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      case 'neutral':
        return 'remove';
      default:
        return '';
    }
  }

  /**
   * Get trend color class
   */
  getTrendColor(): string {
    if (!this.trend) return '';

    switch (this.trend.direction) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-danger';
      case 'neutral':
        return 'text-warning';
      default:
        return '';
    }
  }
}
