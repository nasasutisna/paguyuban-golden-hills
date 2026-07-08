import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ButtonVariant, ButtonSize } from '../form.model';

/**
 * Reusable Form Button Component
 * Features: consistent styling, loading state, icon support, multiple variants
 */
@Component({
  selector: 'app-form-button',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './form-button.component.html',
  styleUrls: ['./form-button.component.scss']
})
export class FormButtonComponent {
  // Button content
  @Input() text = '';
  @Input() icon: string | null = null;
  @Input() iconSlot: 'start' | 'end' | 'icon-only' = 'start';

  // Button appearance
  @Input() variant: ButtonVariant = 'solid';
  @Input() color: string = 'primary';
  @Input() size: ButtonSize = 'default';
  @Input() expand: 'block' | 'full' | null = null;

  // Button state
  @Input() disabled = false;
  @Input() loading = false;
  @Input() type: 'button' | 'submit' = 'button';

  // Styling overrides
  @Input() borderRadius: string = '8px';
  @Input() padding: string | null = null;
  @Input() fontWeight: string = '500';

  // Outputs
  @Output() click = new EventEmitter<Event>();

  /**
   * Check if button is icon only
   */
  get isIconOnly(): boolean {
    return this.iconSlot === 'icon-only' || !this.text;
  }

  /**
   * Handle click
   */
  onClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.click.emit(event);
    }
  }

  /**
   * Get button size classes
   */
  getSizeClass(): string {
    switch (this.size) {
      case 'small':
        return 'btn-small';
      case 'large':
        return 'btn-large';
      default:
        return 'btn-default';
    }
  }

  /**
   * Get button variant class
   */
  getVariantClass(): string {
    return `btn-${this.variant}`;
  }

  /**
   * Check if button should expand
   */
  shouldExpand(): boolean {
    return this.expand === 'block' || this.expand === 'full';
  }

  /**
   * Get expand class
   */
  getExpandClass(): string | null {
    if (this.expand) {
      return `expand-${this.expand}`;
    }
    return null;
  }

  /**
   * Handle keyboard enter
   */
  @HostListener('keydown.enter', ['$event'])
  onEnterPress(event: Event): void {
    if (this.type === 'submit' && !this.disabled && !this.loading) {
      this.onClick(event);
    }
  }
}
