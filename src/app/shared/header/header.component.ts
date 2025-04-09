import { Component, inject } from '@angular/core';
import { SharedModule } from './../../shared';
import { DialogComponent } from '../header-dialog-profil/dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { User } from '../interfaces/user';
import { Observable } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { FirebaseService } from '../services/firebase.service';
import { UserProfilComponent } from './user-profil/user-profil.component';

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
  searchResultsState: boolean = false;

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
      this.searchResultsState = true;
      const lowerSearchTerm = this.searchValue.toLowerCase();

      // Channels filtern: Verwende Object.entries, damit du die id erhältst
      const channels = data.channels
        ? Object.entries(data.channels as Record<string, any>)
          .filter(([id, channel]) =>
            channel.channelName && channel.channelName.toLowerCase().includes(lowerSearchTerm)
          )
          .map(([id, channel]) => ({
            id: id,                // Hier wird die ID zugewiesen
            type: 'Channel',
            data: channel,
          }))
        : [];

      // Users filtern: Analog auch hier mit Object.entries, um die id zu erhalten
      const users = data.users
        ? Object.entries(data.users as Record<string, any>)
          .filter(([id, user]) =>
            user.displayName && user.displayName.toLowerCase().includes(lowerSearchTerm)
          )
          .map(([id, user]) => ({
            id: id,                // Hier wird die ID zugewiesen
            type: 'User',
            data: user,
          }))
        : [];

      // Ergebnisse zusammenführen

      this.searchResults = [
        ...channels,
        ...users,
      ];
    } else {
      this.searchResultsState = false;
      this.searchResults = [];
    }
  }


  openResult(data: string) {
    // console.log('Channel selected:', data);
    this.dialog.open(UserProfilComponent, { 
      data: data,
      panelClass: 'custom-user-profil-container',
    });
    this.searchResultsState = false;
  }


  closeDialog(dialog: string) {
    // this.dialogRef.close(EditProfilDialogComponent);

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
