import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../toast/toast.service';
import { Profile } from '../../core/models/auth.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Navbar component
 * Displays navigation links and authentication controls (login/register or user name/logout)
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div
        class="container mx-auto px-4 h-14 flex items-center justify-between"
      >
        <a routerLink="/" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded bg-blue-500"></div>
          <span class="font-semibold text-gray-900">Renty</span>
        </a>
        <button
          class="md:hidden cursor-pointer p-2"
          (click)="open.set(!open())"
        >
          <span class="block w-6 h-0.5 bg-gray-900 mb-1"></span>
          <span class="block w-6 h-0.5 bg-gray-900 mb-1"></span>
          <span class="block w-6 h-0.5 bg-gray-900"></span>
        </button>
        <div class="hidden md:flex items-center gap-6">
          <a routerLink="/" class="text-gray-700 hover:text-gray-900">Home</a>
          <a routerLink="/listings" class="text-gray-700 hover:text-gray-900"
            >Listings</a
          >
          <a routerLink="/about-us" class="text-gray-700 hover:text-gray-900"
            >About Us</a
          >
          @if (profile()) {
          <a routerLink="/dashboard" class="text-gray-700 hover:text-gray-900"
            >Dashboard</a
          >
          <a routerLink="/list-house" class="text-gray-700 hover:text-gray-900"
            >List Property</a
          >
          }
        </div>
        <div class="hidden md:flex items-center gap-3">
          @if (profile()) {
          <div class="flex items-center gap-3">
            <a
              routerLink="/profile"
              class="text-sm text-gray-700 hover:text-gray-900 cursor-pointer"
              >{{ profile()!.firstName }} {{ profile()!.lastName }}</a
            >
            <button
              (click)="logout()"
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
          } @else {
          <a
            routerLink="/auth/login"
            class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >Login</a
          >
          <a
            routerLink="/auth/register"
            class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
            >Register</a
          >
          }
        </div>
      </div>
      @if (open()) {
      <div class="md:hidden border-t">
        <div class="px-4 py-3 flex flex-col gap-2">
          <a routerLink="/" class="text-gray-700">Home</a>
          <a routerLink="/listings" class="text-gray-700">Listings</a>
          <a routerLink="/about-us" class="text-gray-700">About Us</a>
          @if (profile()) {
          <a routerLink="/dashboard" class="text-gray-700">Dashboard</a>
          <a routerLink="/list-house" class="text-gray-700">List Property</a>
          }
          <div class="h-px bg-gray-200 my-2"></div>
          @if (profile()) {
          <div class="flex flex-col gap-2">
            <a
              routerLink="/profile"
              class="text-gray-700 font-medium hover:text-gray-900"
              >{{ profile()!.firstName }} {{ profile()!.lastName }}</a
            >
            <button
              (click)="logout()"
              class="text-left text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
          } @else {
          <a routerLink="/auth/login" class="text-gray-700">Login</a>
          <a routerLink="/auth/register" class="text-gray-700">Register</a>
          }
        </div>
      </div>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  open = signal(false);
  profile = signal<Profile | null>(null);

  /**
   * Initializes the component and subscribes to profile changes
   */
  ngOnInit(): void {
    // Check if profile is already cached first
    const cachedProfile = this.accountService.profile;
    if (cachedProfile) {
      this.profile.set(cachedProfile);
    }

    // Subscribe to profile changes (this will emit the cached value if available)
    this.accountService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        this.profile.set(profile);
      });

    // Load profile if user is authenticated and not already cached
    if (this.authService.isAuthenticated() && !cachedProfile) {
      this.accountService
        .getProfile()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => {
            this.profile.set(profile);
          },
          error: () => {
            // Error handling is done in AccountService
            this.profile.set(null);
          },
        });
    }
  }

  /**
   * Handles user logout
   */
  logout(): void {
    this.authService
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.accountService.clearProfile();
          this.toast.success('Logged out successfully');
          this.router.navigateByUrl('/');
        },
        error: () => {
          // Even if logout fails, clear local state
          this.accountService.clearProfile();
          this.router.navigateByUrl('/');
        },
      });
  }
}
