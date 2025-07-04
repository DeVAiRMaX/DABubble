import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { SharedModule } from '../../../../shared';
import { AuthService } from '../../../../shared/services/auth.service';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink,
    SharedModule,
    ReactiveFormsModule,
    CommonModule,
    MatProgressBarModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  registerForm: FormGroup;
  registrationError: string | null = null;
  isLoading: boolean = false;
  userExists: boolean = false;

  private authService: AuthService = inject(AuthService);
  private fb = inject(FormBuilder);
   emailInvalid : boolean = false;

  constructor() {
    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email, this.strictEmailValidator()]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      privacyPolicy: [false, Validators.requiredTrue],
    });
  }

  get formControls() {
    return this.registerForm.controls;
  }

  async registNewUser() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.registrationError = null;
    const { displayName, email, password } = this.registerForm.value;

    try {
      await this.authService.registerWithEmailPassword(
        email,
        password,
        displayName
      );
    
    } catch (error: any) {
      console.error('Fehler bei der Registrierung:', error);
      this.emailInvalid = true;
      if (error.code === 'auth/email-already-in-use') {
        this.userExists = true;
        this.registrationError = 'Diese E-Mail-Adresse wird bereits verwendet.';
      } else {
        this.registrationError =
          'Ein Fehler ist bei der Registrierung aufgetreten. Bitte versuchen Sie es erneut.';
      }
    } finally {
      this.isLoading = false;
    }
  }


 strictEmailValidator(): ValidatorFn {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    return emailRegex.test(value) ? null : { strictEmail: true };
  };
}

}
