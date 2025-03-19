import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login.component';
import { RegisterComponent } from './features/auth/components/register/register.component';
import { MainComponentComponent } from './main-component/main-component.component';
import { SelectAvatarComponent } from './features/auth/components/register/select-avatar/select-avatar.component';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'dashboard',
    component: MainComponentComponent,
  },
  {
    path: 'avatar',
    component: SelectAvatarComponent,
  },
];
