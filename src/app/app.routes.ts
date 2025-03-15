import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
    {
        path: '',
        component: LoginComponent
    },
    {
        path: 'dashboard',
        component: MainLayoutComponent
    },
];