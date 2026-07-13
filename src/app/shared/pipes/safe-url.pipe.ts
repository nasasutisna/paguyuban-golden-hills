import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

/**
 * SafeUrl Pipe
 * Bypasses Angular's security for trusted URLs
 * Usage: {{ url | safeUrl }}
 */
@Pipe({
  name: 'safeUrl',
  standalone: true
})
export class SafeUrlPipe implements PipeTransform {
  constructor(private domSanitizer: DomSanitizer) {}

  transform(url: string): SafeUrl {
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
