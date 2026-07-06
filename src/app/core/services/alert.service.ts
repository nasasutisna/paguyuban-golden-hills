import { Injectable } from '@angular/core';
import { AlertButton, AlertController, AlertInput } from '@ionic/angular';
import { Observable, from } from 'rxjs';

/**
 * Alert input configuration interface
 */
export interface AlertInputConfig {
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'date' | 'time' | 'checkbox' | 'radio' | 'textarea';
  name?: string;
  placeholder?: string;
  value?: string | number | boolean | null;
  label?: string;
  id?: string;
  min?: string | number;
  max?: string | number;
  disabled?: boolean;
  checked?: boolean;
  attributes?: Record<string, string>;
}

/**
 * Alert button configuration interface
 */
export interface AlertButtonConfig {
  text?: string;
  handler?: (value?: any) => boolean | void | Promise<boolean | void>;
  cssClass?: string | string[];
  role?: 'cancel' | 'destructive' | 'normal' | 'submit';
  icon?: string;
}

/**
 * Custom alert configuration interface
 */
export interface AlertConfig {
  header?: string;
  subHeader?: string;
  message?: string;
  buttons?: (AlertButton | AlertButtonConfig | string)[];
  inputs?: (AlertInput | AlertInputConfig)[];
  cssClass?: string | string[];
  backdropDismiss?: boolean;
  translucent?: boolean;
  animated?: boolean;
}

/**
 * Alert service for displaying alert dialogs
 * Wraps Ionic AlertController for easier alert management
 */
@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertElement: HTMLIonAlertElement | null = null;

  constructor(private alertController: AlertController) {}

  /**
   * Show a simple alert with a message and OK button
   * @param header - Alert header/title
   * @param message - Alert message
   * @param buttons - Alert buttons (default: ['OK'])
   */
  async show(header: string, message: string, buttons: (string | AlertButton | AlertButtonConfig)[] = ['OK']): Promise<void> {
    await this.dismiss();
    this.alertElement = await this.alertController.create({
      header,
      message,
      buttons,
      backdropDismiss: false
    });
    await this.alertElement.present();
  }

  /**
   * Show an alert and return an observable
   * @param header - Alert header/title
   * @param message - Alert message
   * @param buttons - Alert buttons
   */
  show$(header: string, message: string, buttons?: (string | AlertButton | AlertButtonConfig)[]): Observable<void> {
    return from(this.show(header, message, buttons));
  }

  /**
   * Show a success alert
   * @param header - Alert header (default: 'Success')
   * @param message - Success message
   * @param handler - Optional handler for OK button
   */
  async success(header = 'Success', message?: string, handler?: () => void): Promise<void> {
    await this.dismiss();
    this.alertElement = await this.alertController.create({
      header,
      message,
      buttons: [
        {
          text: 'OK',
          handler: () => handler?.(),
          cssClass: 'success-button'
        }
      ],
      backdropDismiss: false
    });
    await this.alertElement.present();
  }

  /**
   * Show a success alert and return an observable
   * @param header - Alert header
   * @param message - Success message
   * @param handler - Optional handler for OK button
   */
  success$(header?: string, message?: string, handler?: () => void): Observable<void> {
    return from(this.success(header, message, handler));
  }

  /**
   * Show an error alert
   * @param header - Alert header (default: 'Error')
   * @param message - Error message
   * @param handler - Optional handler for OK button
   */
  async error(header = 'Error', message?: string, handler?: () => void): Promise<void> {
    await this.dismiss();
    this.alertElement = await this.alertController.create({
      header,
      message,
      buttons: [
        {
          text: 'OK',
          handler: () => handler?.(),
          cssClass: 'error-button'
        }
      ],
      backdropDismiss: false
    });
    await this.alertElement.present();
  }

  /**
   * Show an error alert and return an observable
   * @param header - Alert header
   * @param message - Error message
   * @param handler - Optional handler for OK button
   */
  error$(header?: string, message?: string, handler?: () => void): Observable<void> {
    return from(this.error(header, message, handler));
  }

  /**
   * Show a confirmation alert
   * @param header - Alert header
   * @param message - Confirmation message
   * @param confirmHandler - Handler for confirm button
   * @param cancelHandler - Handler for cancel button
   * @param confirmText - Text for confirm button (default: 'Confirm')
   * @param cancelText - Text for cancel button (default: 'Cancel')
   */
  async confirm(
    header: string,
    message: string,
    confirmHandler?: () => void,
    cancelHandler?: () => void,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ): Promise<void> {
    await this.dismiss();
    this.alertElement = await this.alertController.create({
      header,
      message,
      buttons: [
        {
          text: cancelText,
          role: 'cancel',
          handler: () => cancelHandler?.()
        },
        {
          text: confirmText,
          role: 'confirm',
          handler: () => confirmHandler?.()
        }
      ],
      backdropDismiss: false
    });
    await this.alertElement.present();
  }

  /**
   * Show a confirmation alert and return an observable
   * @param header - Alert header
   * @param message - Confirmation message
   * @param confirmHandler - Handler for confirm button
   * @param cancelHandler - Handler for cancel button
   * @param confirmText - Text for confirm button
   * @param cancelText - Text for cancel button
   */
  confirm$(
    header: string,
    message: string,
    confirmHandler?: () => void,
    cancelHandler?: () => void,
    confirmText?: string,
    cancelText?: string
  ): Observable<void> {
    return from(this.confirm(header, message, confirmHandler, cancelHandler, confirmText, cancelText));
  }

  /**
   * Show a prompt alert with input
   * @param header - Alert header
   * @param message - Prompt message
   * @param inputConfig - Input configuration
   * @param confirmHandler - Handler for confirm button, receives input value
   * @param placeholder - Input placeholder
   * @param inputType - Input type (default: 'text')
   */
  async prompt(
    header: string,
    message?: string,
    inputConfig?: AlertInputConfig,
    confirmHandler?: (value: any) => void,
    placeholder = '',
    inputType: AlertInputConfig['type'] = 'text'
  ): Promise<void> {
    await this.dismiss();
    this.alertElement = await this.alertController.create({
      header,
      message,
      inputs: [
        {
          type: inputType,
          placeholder,
          ...inputConfig
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'OK',
          role: 'confirm',
          handler: (value) => confirmHandler?.(value)
        }
      ],
      backdropDismiss: false
    });
    await this.alertElement.present();
  }

  /**
   * Show a prompt alert and return an observable
   * @param header - Alert header
   * @param message - Prompt message
   * @param inputConfig - Input configuration
   * @param confirmHandler - Handler for confirm button
   * @param placeholder - Input placeholder
   * @param inputType - Input type
   */
  prompt$(
    header: string,
    message?: string,
    inputConfig?: AlertInputConfig,
    confirmHandler?: (value: any) => void,
    placeholder?: string,
    inputType?: AlertInputConfig['type']
  ): Observable<void> {
    return from(this.prompt(header, message, inputConfig, confirmHandler, placeholder, inputType));
  }

  /**
   * Show a custom alert with full configuration
   * @param config - Alert configuration
   */
  async custom(config: AlertConfig): Promise<void> {
    await this.dismiss();
    this.alertElement = await this.alertController.create({
      ...config,
      backdropDismiss: config.backdropDismiss ?? false,
      animated: config.animated ?? true
    });
    await this.alertElement.present();
  }

  /**
   * Show a custom alert and return an observable
   * @param config - Alert configuration
   */
  custom$(config: AlertConfig): Observable<void> {
    return from(this.custom(config));
  }

  /**
   * Dismiss the current alert
   */
  async dismiss(): Promise<void> {
    if (this.alertElement) {
      try {
        await this.alertElement.dismiss();
        this.alertElement = null;
      } catch (error) {
        console.error('Error dismissing alert:', error);
        this.alertElement = null;
      }
    }
  }

  /**
   * Dismiss the current alert and return an observable
   */
  dismiss$(): Observable<void> {
    return from(this.dismiss());
  }
}
