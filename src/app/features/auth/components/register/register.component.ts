import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { newUserData } from '../../../../classes/register.class'
import { SharedModule } from '../../../../shared';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, SharedModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerForm: FormGroup;
  newUserData = new newUserData();
  private firebase: FirebaseService = inject(FirebaseService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  constructor() {
    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      privacyPolicy: [false, Validators.requiredTrue]
    });
  }

  get formControls() {
    return this.registerForm.controls;
  }

  async registNewUser() {
    if (this.registerForm.valid) {
      this.newUserData.displayName = this.registerForm.value.displayName;
      this.newUserData.email = this.registerForm.value.email;
      this.newUserData.password = this.registerForm.value.password;
      const newUser = this.newUserData.toJson();
      try {
        await this.firebase.creatNewUser(newUser);
        this.router.navigate(['/avatar']);
      } catch (error) {
        console.error('Fehler bei der Registrierung:', error);
        // Hier könnten Sie eine Fehlerbehandlung hinzufügen
      }
    }
  }
}
