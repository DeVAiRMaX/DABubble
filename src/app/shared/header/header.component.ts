import { Component, inject } from '@angular/core';
import { SharedModule } from './../../shared';
import { DialogComponent } from '../header-dialog-profil/dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { User } from '../interfaces/user';
import { Observable } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SharedModule, AsyncPipe, NgIf],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  searchValue: string = '';
  searchResults: any[] = [];

  private authService: AuthService = inject(AuthService);
  private databaseService: FirebaseService = inject(FirebaseService);

  user$: Observable<User | null>;

  constructor(public dialog: MatDialog) {
    this.user$ = this.authService.user$;
  }

  async onSearchChange(): Promise<void> {
  
    // Alle Daten aus der Datenbank abrufen
    const data = await this.databaseService.getDatabaseData();
  
    if (this.searchValue.trim().length > 0) {
      const lowerSearchTerm = this.searchValue.toLowerCase();
  
      const channels: any[] = data.channels 
        ? Object.values(data.channels as Record<string, any>).filter((channel: any) =>
            channel.channelName && channel.channelName.toLowerCase().includes(lowerSearchTerm)
          )
        : [];
  
      const users: any[] = data.users 
        ? Object.values(data.users as Record<string, any>).filter((user: any) =>
            user.displayName && user.displayName.toLowerCase().includes(lowerSearchTerm)
          )
        : [];
      
      // messages filtern (wenn vorhanden)
      // const messages: any[] = data.messages 
      //   ? Object.values(data.users as Record<string, any>).filter((user: any) =>
      //       user.displayName && user.displayName.toLowerCase().includes(lowerSearchTerm)
      //     )
      //   : [];
  
      this.searchResults = [
        ...channels.map((channel: any) => ({
          type: 'Channel',
          data: channel
        })),
        ...users.map((user: any) => ({
          type: 'User',
          data: user
        }))
      ];
  
    } else {
      this.searchResults = [];
    }
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
