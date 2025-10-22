import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
// 🔥 Import AuthService
import { AuthService } from '../../core/account-state'; // Adjust path as needed

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
  
  
  generatedPassword = signal(''); // Used to show/hide the form/credentials block
  randomId = signal('');          // Used to display the generated ID

  private authService = inject(AuthService);
  private router = inject(Router);

  async createAccount() {
    this.errorMessage.set('');
    this.generatedPassword.set(''); // Reset generated password display

    const prnValue = this.prn().trim().toUpperCase();
    const admissionValue = this.admissionNumber().trim();

    if (!prnValue || !admissionValue) {
      this.errorMessage.set('Please fill in both PRN and Admission Number.');
      return;
    }

    if (!/^\d{4,5}$/.test(admissionValue)) {
      this.errorMessage.set('Admission Number must be 4-5 digits.');
      return;
    }

    this.prn.set(prnValue); // Ensure PRN is uppercase in the signal

    const password = prnValue + admissionValue; // Temporary Password
    const uniqueRandomId = this.generateRandomId(16);

    try {
      await this.authService.registerWithPrnAndPassword(
        prnValue, 
        password, 
        uniqueRandomId
      );
      
      this.generatedPassword.set(password);
      this.randomId.set(uniqueRandomId);
      
      await this.authService.logout();

    } catch (error: any) {
      console.error('Registration failed:', error.code || error);

      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage.set("An account with this PRN already exists.");
      } else if (error.code === 'auth/weak-password') {
        this.errorMessage.set("The combined PRN and Admission Number is too short for a password. It must be at least 6 characters.");
      } else {
        this.errorMessage.set("Registration failed. Please check your inputs or try again.");
      }
    }
  }

  // Utility method (remains the same)
  private generateRandomId(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}