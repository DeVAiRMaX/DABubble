import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { VariablesService } from '../../../variables.service';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FirebaseService } from '../../services/firebase.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-tagging-persons-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tagging-persons-dialog.component.html',
  styleUrl: './tagging-persons-dialog.component.scss'
})
export class TaggingPersonsDialogComponent implements OnInit {
  nametoFilter: string = '';
  modeForTagging: string = '';

  constructor(private variableService: VariablesService, private dialogRef: MatDialogRef<TaggingPersonsDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: { mode: string }) { }

  allContacts = [
    { name: 'Frederik Beck (Du)', img: '/assets/img/character/3.png' },
    { name: 'Sofia Müller', img: '/assets/img/character/2.png' },
    { name: 'Noah Braun', img: '/assets/img/character/1.png' },
    { name: 'Elise Roth', img: '/assets/img/character/4.png' },
    { name: 'Elias Neumann', img: '/assets/img/character/5.png' },
    { name: 'Steffen Hoffmann', img: '/assets/img/character/6.png' }
  ];
  contactsArray: any[] = [];

  taggedContacts: { name: string; img: string; }[] = [];
  taggedContactsThread: { name: string; img: string }[] = [];
  filteredContacts: { name: string; img: string }[] = [];
  filteredContactsThread: { name: string; img: string }[] = [];

  private firebaseService: FirebaseService = inject(FirebaseService);

  async ngOnInit() {

    this.loadContacts();

    this.modeForTagging = this.data.mode;


    this.taggedContacts = this.variableService.getTaggedContactsFromChat();
    this.taggedContactsThread = this.variableService.getTaggedcontactsFromThreads();

    this.updateFilteredContacts();
    this.updateFilteredThreadContacts();
    // console.log(this.taggedContacts, this.taggedContactsThread, this.filteredContactsThread, this.filteredContacts);
    // console.log('gewählter Modus ist' + this.data.mode);
    // console.log(this.taggedContacts, this.taggedContactsThread, this.filteredContactsThread, this.filteredContacts);
    // console.log('gewählter Modus ist' + this.data.mode);

    this.variableService.nameToFilter$.subscribe((value) => {
      this.nametoFilter = value;



      if (this.nametoFilter === '') {
        this.closeDiaglog();
        return;
      }

      if (this.nametoFilter === '@') {
        this.updateFilteredContacts();
        this.updateFilteredThreadContacts();
        return;
      }

      const filterText = this.nametoFilter.includes('@')
        ? this.nametoFilter.split('@').pop()?.trim() || ''
        : this.nametoFilter.trim();


      this.filteredContacts = this.filteredContacts.filter(contact => contact.name.toLowerCase().includes(filterText.toLowerCase()));
      this.filteredContactsThread = this.filteredContactsThread.filter(contact => contact.name.toLowerCase().includes(filterText.toLowerCase()));
    });
  }


  closeDiaglog() { this.dialogRef.close(); }


  async loadContacts() {
    this.firebaseService.getAllUsers().subscribe(users => {
      this.contactsArray.push(users);
      
    
    });
    console.log(this.contactsArray);
  }



addContactToChat(contact: any) {

  const nameToRemove = this.filteredContacts.findIndex((c) => c.name === contact.name);


  if (nameToRemove !== -1) {

    const removedContact = this.filteredContacts.splice(nameToRemove, 1)[0];
    this.taggedContacts.push(removedContact);
    this.variableService.setTaggedContactsFromChat(this.taggedContacts);
    this.updateFilteredContacts();


  }

}

addContactToThread(contact: any) {

  const nameToRemove = this.filteredContactsThread.findIndex((c) => c.name === contact.name);


  if (nameToRemove !== -1) {

    const removedContact = this.filteredContactsThread.splice(nameToRemove, 1)[0];
    this.taggedContactsThread.push(removedContact);
    // console.log(this.taggedContactsThread);
    // console.log(this.taggedContactsThread);
    this.variableService.setTaggedContactsFromThread(this.taggedContactsThread);
    this.updateFilteredThreadContacts();


  }

}

updateFilteredThreadContacts() {
  this.filteredContactsThread = this.allContacts.filter(
    (contact) => !this.taggedContactsThread.some((tagged) => tagged.name === contact.name)
  );
  // console.log('filtered Contacts sind:' + this.filteredContactsThread);
  // console.log('filtered Contacts sind:' + this.filteredContactsThread);
}

updateFilteredContacts() {
  this.filteredContacts = this.allContacts.filter(
    (contact) => !this.taggedContacts.some((tagged) => tagged.name === contact.name)
  );

}

checkWhichMode(contact: any) {
  if (this.modeForTagging == 'thread') {

    this.addContactToThread(contact);


  } else if (this.modeForTagging == 'chat') {
    this.addContactToChat(contact);
  } else {

    console.error('No Conact Found');
  }
}
}
