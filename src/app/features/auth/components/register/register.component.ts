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

  isLoading:boolean = false;

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

  registNewUser() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.newUserData.displayName = this.registerForm.value.displayName;
      this.newUserData.email = this.registerForm.value.email;
      this.newUserData.password = this.registerForm.value.password;
      const newUser = this.newUserData.toJson();
  
      this.firebase.creatNewUser(newUser)
        .then(userId => {
          console.log('User successfully registered, navigating to avatar page');
          this.router.navigate([`/avatar/${userId}`]);
        })
        .catch(error => {
          console.error('Fehler bei der Registrierung:', error);
        })
        .finally(() => {
          this.isLoading = false;
        });
    }
  }
  
  
}
