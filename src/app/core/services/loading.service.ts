import { Injectable } from '@angular/core';
import { LoadingController, LoadingOptions } from '@ionic/angular';
import { Observable, from, of } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Loading service for managing loading overlays
 * Wraps Ionic LoadingController for easier loading indicator management
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingElement: HTMLIonLoadingElement | null = null;

  constructor(private loadingController: LoadingController) {}

  /**
   * Show a loading indicator
   * @param options - Loading options
   */
  async show(options?: LoadingOptions): Promise<void> {
    // Dismiss any existing loading
    await this.dismiss();

    const defaultOptions: LoadingOptions = {
      message: 'Please wait...',
      spinner: 'crescent',
      ...options
    };

    this.loadingElement = await this.loadingController.create(defaultOptions);
    await this.loadingElement.present();
  }

  /**
   * Show a loading indicator and return an observable
   * @param options - Loading options
   */
  show$(options?: LoadingOptions): Observable<void> {
    return from(this.show(options));
  }

  /**
   * Dismiss the current loading indicator
   */
  async dismiss(): Promise<void> {
    if (this.loadingElement) {
      try {
        await this.loadingElement.dismiss();
        this.loadingElement = null;
      } catch (error) {
        console.error('Error dismissing loading:', error);
        this.loadingElement = null;
      }
    }
  }

  /**
   * Dismiss the current loading indicator and return an observable
   */
  dismiss$(): Observable<void> {
    return from(this.dismiss());
  }

  /**
   * Show loading with a message
   * @param message - Loading message
   */
  async showMessage(message: string): Promise<void> {
    await this.show({ message });
  }

  /**
   * Show loading with a message and return an observable
   * @param message - Loading message
   */
  showMessage$(message: string): Observable<void> {
    return from(this.showMessage(message));
  }

  /**
   * Check if loading is currently shown
   */
  isLoading(): boolean {
    return this.loadingElement !== null;
  }
}
