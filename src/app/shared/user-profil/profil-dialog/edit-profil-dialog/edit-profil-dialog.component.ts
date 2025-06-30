import { Component, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../../../../shared';
import { AuthService } from '../../../../shared/services/auth.service';
import { Observable } from 'rxjs';
import { User } from '../../../../shared/interfaces/user';
import { ProfilePicsComponent } from './profile-pics/profile-pics.component';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { VariablesService } from '../../../../variables.service';

@Component({
  selector: 'app-edit-profil-dialog',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './edit-profil-dialog.component.html',
  styleUrl: './edit-profil-dialog.component.scss',
})
export class EditProfilDialogComponent {
  private authService: AuthService = inject(AuthService);
  private firebaseService: FirebaseService = inject(FirebaseService);
   public variableService: VariablesService = inject(VariablesService);
    private isAGuestUser: boolean = false;
  user$: Observable<User | null>;

  displayName: string = '';
  formInvalid: boolean = false;
  oldUserPic: string = '';
  newUserPic: string = '';
  changedProfilePic: boolean = false;

  emptyUserName: boolean = false;

  constructor(
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<EditProfilDialogComponent>,
    public pictureDialog: MatDialogRef<ProfilePicsComponent>
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
  
  const user = this.authService.getCurrentUser();
  console.log('aktueller User', user);
  this.oldUserPic = user?.avatar || '';
  console.log(this.oldUserPic);
  this.displayName = user?.displayName || '';
  this.checkFormInvalid();

  this.variableService.userIsAGuest$.subscribe((value) =>{
    this.isAGuestUser = value;
    console.log('ist ein gast:', this.isAGuestUser);
  })
    
  }

  closeDialog() {
    this.dialogRef.close(EditProfilDialogComponent);
  }

  saveProfil() {
    const currentUser = this.authService.getCurrentUserUID();

    if (this.displayName == '') {
      this.emptyUserName = true;
      this.variableService.notifyProfileNameChanged();
      return;
    }
    if (currentUser) {
      this.authService.updateUserName(currentUser, this.displayName);
      this.variableService.notifyProfileNameChanged();
    } else {
      console.error('Current user not found.');
    }
    this.closeDialog();
  }

  checkFormInvalid() {
    if (this.displayName.trim() !== '' || this.changedProfilePic) {
      this.formInvalid = true;
    } else {
      this.formInvalid = false;
    }
  }

  changeProfilePic() {
    const profileDialogRef = this.dialog.open(ProfilePicsComponent, {});

    profileDialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.firebaseService.updateAvatar(
          result,
          this.authService.getCurrentUserUID()!
        );
      }
    });
  }
}
