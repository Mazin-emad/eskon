import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeroComponent } from './components/hero/hero.component';
import { ListingsComponent } from './components/listings/listings.component';
import { FeaturesComponent } from './components/features/features.component';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../auth/services/auth.service';
import { Profile } from '../../core/models/auth.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProblemAndSolutionComponent } from '../about-us/problem-and-solution.component';

/**
 * Home page component
 * Displays the main landing page and verifies user authentication via profile check
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeroComponent,
    ListingsComponent,
    FeaturesComponent,
    ProblemAndSolutionComponent,
  ],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  city = '';
  type = '';
  minPrice = 0;
  maxPrice = 10000;

  // Profile state for UI display
  profile = signal<Profile | null>(null);
  loading = signal(false);

  /**
   * Initializes the component and checks user authentication via profile
   */
  ngOnInit(): void {
    // Only check profile if user has a token
    if (this.authService.isAuthenticated()) {
      this.loadProfile();
    }
  }

  /**
   * Loads user profile to verify authentication
   * Profile is cached in AccountService for better performance
   */
  private loadProfile(): void {
    this.loading.set(true);

    this.accountService
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.loading.set(false);
        },
        error: (error) => {
          // Error handling: tokens cleared and redirect handled by AccountService
          // Just update local state
          this.profile.set(null);
          this.loading.set(false);
        },
      });
  }
}
