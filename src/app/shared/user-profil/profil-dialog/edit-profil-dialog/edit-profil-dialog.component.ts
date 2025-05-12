import { Component, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../../../../shared';
import { AuthService } from '../../../../shared/services/auth.service';
import { Observable } from 'rxjs';
import { User } from '../../../../shared/interfaces/user';

@Component({
  selector: 'app-edit-profil-dialog',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './edit-profil-dialog.component.html',
  styleUrl: './edit-profil-dialog.component.scss'
})
export class EditProfilDialogComponent {

  private authService: AuthService = inject(AuthService);
  user$: Observable<User | null>;

  displayName: string = '';
  formInvalid: boolean = false;

  emptyUserName: boolean = false;

  constructor(public dialog: MatDialog, public dialogRef: MatDialogRef<EditProfilDialogComponent>) {
    this.user$ = this.authService.user$;
  }

  closeDialog() {
    this.dialogRef.close(EditProfilDialogComponent);
  }

  saveProfil() {
    const currentUser = this.authService.getCurrentUserUID();

    if (this.displayName == '') {
      this.emptyUserName = true;
      return
    }
    if (currentUser) {
      this.authService.updateUserName(currentUser, this.displayName);
    } else {
      console.error('Current user not found.');
    }
    this.closeDialog();
  }

  checkFormInvalid() {
    if (this.displayName === '') {
      this.formInvalid = false;
    } else {
      this.formInvalid = true;
    }
  }

}
