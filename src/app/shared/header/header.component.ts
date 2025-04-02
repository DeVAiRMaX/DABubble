import { Component, inject } from '@angular/core';
import { SharedModule } from './../../shared';
import { DialogComponent } from '../header-dialog-profil/dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { User } from '../interfaces/user';
import { Observable } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SharedModule, AsyncPipe, NgIf],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private authService: AuthService = inject(AuthService);
  user$: Observable<User | null>;

  constructor(public dialog: MatDialog) {
    this.user$ = this.authService.user$;
  }

  openDialog() {
    if (this.authService.getCurrentUser()) {
      this.dialog.open(DialogComponent, {});
    } else {
      console.log(
        'Dialog kann nicht geöffnet werden, kein Benutzer eingeloggt.'
      );
    }
  }
}
