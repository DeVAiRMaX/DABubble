import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../../../shared/services/auth.service';

@Component({
  selector: 'app-new-password',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './new-password.component.html',
  styleUrl: './new-password.component.scss',
})
export class NewPasswordComponent implements OnInit {
  newPassword = '';
  confirmPassword = '';
  oobCode: string | null = null;
  successMessage: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private authService: AuthService = inject(AuthService);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.oobCode = params.get('oobCode');
      if (!this.oobCode) {
        this.errorMessage = 'Ungültiger oder fehlender Reset-Code in der URL.';
      }
    });
  }

  async confirmNewPassword() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.oobCode) {
      this.errorMessage =
        'Kein Reset-Code gefunden. Bitte fordern Sie eine neue E-Mail an.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Die Passwörter stimmen nicht überein.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      return;
    }

    this.isLoading = true;

    try {
      await this.authService.confirmPasswordReset(
        this.oobCode,
        this.newPassword
      );
      this.successMessage =
        'Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt anmelden.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } catch (error: any) {
      this.errorMessage = this.handleConfirmResetError(error.code);
      console.error('Fehler beim Setzen des neuen Passworts:', error);
    } finally {
      this.isLoading = false;
    }
  }

  handleConfirmResetError(errorCode: string): string {
    switch (errorCode) {
      case 'auth/expired-action-code':
        return 'Der Link ist abgelaufen. Bitte fordere einen neuen an.';
      case 'auth/invalid-action-code':
        return 'Der Link ist ungültig oder wurde bereits verwendet.';
      case 'auth/user-disabled':
        return 'Dein Benutzerkonto wurde deaktiviert.';
      case 'auth/user-not-found':
        return 'Der Benutzer zu diesem Link wurde nicht gefunden.';
      case 'auth/weak-password':
        return 'Das Passwort ist zu schwach. Es muss mindestens 6 Zeichen lang sein.';
      default:
        return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.';
    }
  }
}
