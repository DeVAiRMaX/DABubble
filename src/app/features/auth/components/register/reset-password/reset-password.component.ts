import { Component, inject } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../../shared/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, NgIf],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  email: string = '';
  resetSuccess: boolean = false;
  resetError: string = '';
  authService: AuthService = inject(AuthService);

  async sendPasswordResetEmail() {
    this.resetError = '';
    try {
      await this.authService.sendPasswordResetEmail(this.email);
      this.resetSuccess = true;
    } catch (error: any) {
      this.resetError = this.handleResetPasswordError(error.code);
      console.error(
        'Fehler beim Senden der Passwortzurücksetzungs-E-Mail:',
        error
      );
    }
  }

  handleResetPasswordError(errorCode: string): string {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
      case 'auth/user-not-found':
        return 'Es existiert kein Benutzer mit dieser E-Mail-Adresse.';
      default:
        return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
    }
  }
}
