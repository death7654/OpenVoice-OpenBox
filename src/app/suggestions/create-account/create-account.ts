import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-create-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-account.html',
  styleUrls: ['./create-account.scss']
})
export class CreateAccount {
  prn = signal('');
  admissionNumber = signal('');
  errorMessage = signal('');
  generatedPassword = signal('');
  randomId = signal('');


  createAccount() {
    const prnValue = this.prn().trim().toUpperCase();
    const admissionValue = this.admissionNumber().trim();

    if (!prnValue || !admissionValue) {
      this.errorMessage.set('Please fill in both PRN and Admission Number.');
      this.generatedPassword.set('');
      return;
    }

    if (!/^\d{4,5}$/.test(admissionValue)) {
      this.errorMessage.set('Admission Number must be 4-5 digits.');
      this.generatedPassword.set('');
      return;
    }

    this.prn.set(prnValue);

    // Generate password: PRN + Admission Number
    const password = prnValue + admissionValue;
    this.generatedPassword.set(password);
    this.errorMessage.set('');

    this.randomId.set(this.generateRandomId(16));
  }

  private generateRandomId(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
