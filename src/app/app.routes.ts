import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login.component';
import { RegisterComponent } from './features/auth/components/register/register.component';
import { MainComponentComponent } from './main-component/main-component.component';
import { SelectAvatarComponent } from './features/auth/components/register/select-avatar/select-avatar.component';
import { ResetPasswordComponent } from './features/auth/components/register/reset-password/reset-password.component';
import { ImpressumComponent } from './shared/impressum/impressum.component';
import { DataProtectionComponent } from './shared/data-protection/data-protection.component';
import { DirectMessageComponent } from './shared/direct-message/direct-message.component';
import { NewPasswordComponent } from './features/auth/components/register/reset-password/new-password/new-password.component';
import { ChannelChatComponent } from './shared/channel-chat/channel-chat.component';

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
    children: [
      { path: 'channel/:channelId', component: ChannelChatComponent },
      { path: 'dm/:conversationId', component: DirectMessageComponent },
    ],
  },
  {
    path: 'dashboard/:id',
    component: MainComponentComponent,
  },
  {
    path: 'avatar',
    component: SelectAvatarComponent,
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
  },
  {
    path: 'new-password',
    component: NewPasswordComponent,
  },
  {
    path: 'confirm-reset-password',
    component: NewPasswordComponent,
  },
  {
    path: 'impressum',
    component: ImpressumComponent,
  },
  {
    path: 'datenschutz',
    component: DataProtectionComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
