import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; 
import { Subscription } from 'rxjs';

// Ensure the paths below are correct for your project structure
import { AuthService } from '../../core/account-state'; 
// Updated paths to reflect a deeper directory structure based on your last input
import { Login } from './login/login'; 
import { Profile } from './profile/profile'; 

@Component({
  selector: 'app-account',
  standalone: true, 
  // CRITICAL: Must import all child components and CommonModule
  imports: [CommonModule, RouterModule, Login, Profile],
  templateUrl: './account.html',
  // Use styleUrl for single style file, which is Angular best practice
  styleUrl: './account.scss' 
})
export class Account implements OnInit, OnDestroy {
  private authService: AuthService = inject(AuthService); 
  private router = inject(Router);
  private authSubscription!: Subscription;

  isLoggedIn = signal<boolean | null>(null); 
  isLoading = signal(true); 

  ngOnInit(): void {
    // Subscribe to Auth state changes to determine which view to render
    // If AuthService.userState$ is an Observable, this subscribe should work.
    this.authSubscription = this.authService.userState$.subscribe(state => {
      this.isLoggedIn.set(state.isLoggedIn);
      this.isLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}
