import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/account-state';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  private authService: AuthService = inject(AuthService);
  private router = inject(Router);
  prn = signal('');
  password = signal('');
  errorMessage = signal('');
  isLoading = signal(false);

  // 🔥 NEW: Signal to control success/failure messages in the UI
  submissionStatus = signal<'success' | 'failed' | ''>('');

  id: string | null = null; // Unused, keeping it for now

  async login() {
    const prnValue = this.prn().trim().toUpperCase();
    const passwordValue = this.password().trim();

    if (!prnValue || !passwordValue) {
      this.errorMessage.set('Please enter your Student ID (PRN) and Password.');
      this.submissionStatus.set(''); // Clear any old status
      return;
    }

    this.errorMessage.set('');
    this.submissionStatus.set(''); // Reset status before starting
    this.isLoading.set(true);

    try {
      await this.authService.signInWithPrnAndPassword(prnValue, passwordValue);

      // On successful sign-in, set status to success.
      // The AuthService is configured to handle the actual redirection after this.
      this.submissionStatus.set('success');
      this.router.navigate(['/suggestions']);
    } catch (error) {
      console.error('Login error in component:', error);

      // On failure: set status to failed and display the specific error message.
      this.submissionStatus.set('failed');
      const message = error instanceof Error ? error.message : 'An unknown login error occurred.';
      this.errorMessage.set(message);

      this.password.set('');
    } finally {
      // Only stop loading if the login was NOT successful, as a successful login
      // results in a full page redirect handled by the AuthService.
      if (this.submissionStatus() !== 'success') {
        this.isLoading.set(false);
      }
    }
  }
}
