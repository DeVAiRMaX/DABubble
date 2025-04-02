import { Component, inject, input, Input } from '@angular/core';
import { SharedModule } from './../../shared';
import { DialogComponent } from '../header-dialog-profil/dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { User } from '../interfaces/user';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  // @Input() user!: { displayName: string; avatar: string };
  private authService: AuthService = inject(AuthService);
  user: User | null = null;

  constructor(public dialog: MatDialog) {}

  ngOnInit() {
    // this.toJSON();
    this.user = this.authService.getCurrentUser() as User;
    console.log(this.user.avatar);
  }

  // toJSON() {
  //   JSON.stringify(this.user);
  // }

  openDialog() {
    this.dialog.open(DialogComponent, {});
  }
}
