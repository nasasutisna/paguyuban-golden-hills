import { Injectable } from '@angular/core';
import { ToastController, ToastOptions, ToastButton } from '@ionic/angular';
import { Observable, from } from 'rxjs';

/**
 * Toast position enum
 */
export enum ToastPosition {
  Top = 'top',
  Bottom = 'bottom',
  Middle = 'middle'
}

/**
 * Custom toast configuration interface
 */
export interface ToastConfig {
  message: string;
  duration?: number;
  position?: ToastPosition;
  color?: string;
  showCloseButton?: boolean;
  closeButtonText?: string;
  icon?: string;
  buttons?: (ToastButton | string)[];
  cssClass?: string | string[];
  header?: string;
  translucent?: boolean;
}

/**
 * Toast service for displaying toast notifications
 * Wraps Ionic ToastController for easier toast management
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastElement: HTMLIonToastElement | null = null;

  constructor(private toastController: ToastController) {}

  /**
   * Show a simple toast message
   * @param message - Message to display
   * @param duration - Duration in milliseconds (default: 3000)
   */
  async show(message: string, duration = 3000): Promise<void> {
    await this.dismiss();
    this.toastElement = await this.toastController.create({
      message,
      duration,
      position: ToastPosition.Bottom,
      color: 'dark'
    });
    await this.toastElement.present();
  }

  /**
   * Show a toast message and return an observable
   * @param message - Message to display
   * @param duration - Duration in milliseconds
   */
  show$(message: string, duration = 3000): Observable<void> {
    return from(this.show(message, duration));
  }

  /**
   * Show a success toast
   * @param message - Success message
   * @param duration - Duration in milliseconds
   */
  async success(message: string, duration = 3000): Promise<void> {
    await this.dismiss();
    this.toastElement = await this.toastController.create({
      message,
      duration,
      position: ToastPosition.Bottom,
      color: 'success',
      icon: 'checkmark-circle'
    });
    await this.toastElement.present();
  }

  /**
   * Show a success toast and return an observable
   * @param message - Success message
   * @param duration - Duration in milliseconds
   */
  success$(message: string, duration = 3000): Observable<void> {
    return from(this.success(message, duration));
  }

  /**
   * Show an error toast
   * @param message - Error message
   * @param duration - Duration in milliseconds
   */
  async error(message: string, duration = 5000): Promise<void> {
    await this.dismiss();
    this.toastElement = await this.toastController.create({
      message,
      duration,
      position: ToastPosition.Bottom,
      color: 'danger',
      icon: 'warning'
    });
    await this.toastElement.present();
  }

  /**
   * Show an error toast and return an observable
   * @param message - Error message
   * @param duration - Duration in milliseconds
   */
  error$(message: string, duration = 5000): Observable<void> {
    return from(this.error(message, duration));
  }

  /**
   * Show an info toast
   * @param message - Info message
   * @param duration - Duration in milliseconds
   */
  async info(message: string, duration = 3000): Promise<void> {
    await this.dismiss();
    this.toastElement = await this.toastController.create({
      message,
      duration,
      position: ToastPosition.Bottom,
      color: 'primary',
      icon: 'information-circle'
    });
    await this.toastElement.present();
  }

  /**
   * Show an info toast and return an observable
   * @param message - Info message
   * @param duration - Duration in milliseconds
   */
  info$(message: string, duration = 3000): Observable<void> {
    return from(this.info(message, duration));
  }

  /**
   * Show a warning toast
   * @param message - Warning message
   * @param duration - Duration in milliseconds
   */
  async warning(message: string, duration = 4000): Promise<void> {
    await this.dismiss();
    this.toastElement = await this.toastController.create({
      message,
      duration,
      position: ToastPosition.Bottom,
      color: 'warning',
      icon: 'alert-triangle'
    });
    await this.toastElement.present();
  }

  /**
   * Show a warning toast and return an observable
   * @param message - Warning message
   * @param duration - Duration in milliseconds
   */
  warning$(message: string, duration = 4000): Observable<void> {
    return from(this.warning(message, duration));
  }

  /**
   * Show a toast with custom configuration
   * @param config - Toast configuration
   */
  async custom(config: ToastConfig): Promise<void> {
    await this.dismiss();
    const options: ToastOptions = {
      message: config.message,
      duration: config.duration ?? 3000,
      position: config.position ?? ToastPosition.Bottom,
      color: config.color ?? 'dark',
      icon: config.icon,
      buttons: config.buttons,
      cssClass: config.cssClass,
      header: config.header,
      translucent: config.translucent ?? false
    };

    this.toastElement = await this.toastController.create(options);
    await this.toastElement.present();
  }

  /**
   * Show a custom toast and return an observable
   * @param config - Toast configuration
   */
  custom$(config: ToastConfig): Observable<void> {
    return from(this.custom(config));
  }

  /**
   * Dismiss the current toast
   */
  async dismiss(): Promise<void> {
    if (this.toastElement) {
      try {
        await this.toastElement.dismiss();
        this.toastElement = null;
      } catch (error) {
        console.error('Error dismissing toast:', error);
        this.toastElement = null;
      }
    }
  }

  /**
   * Dismiss the current toast and return an observable
   */
  dismiss$(): Observable<void> {
    return from(this.dismiss());
  }
}
