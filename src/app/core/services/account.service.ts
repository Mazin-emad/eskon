import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, catchError, throwError, tap, of } from 'rxjs';
import { EnvironmentConfig } from '../config/environment.config';
import {
  Profile,
  ChangePasswordRequest,
} from '../models/auth.models';
import { AuthService } from '../../auth/services/auth.service';

/**
 * Account service
 * Handles user account-related API calls including profile management
 * and password changes. Caches profile data for better performance.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = EnvironmentConfig.apiBaseUrl;

  // Cache profile using BehaviorSubject for reactive updates
  private readonly profileSubject = new BehaviorSubject<Profile | null>(null);
  readonly profile$ = this.profileSubject.asObservable();

  // Track loading state
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  /**
   * Gets the current cached profile value
   * @returns The cached profile or null if not loaded
   */
  get profile(): Profile | null {
    return this.profileSubject.value;
  }

  /**
   * Retrieves the current user's profile information
   * Caches the result for better performance. If profile is already cached,
   * returns cached value immediately, otherwise fetches from API.
   * @param forceRefresh If true, forces a fresh fetch even if profile is cached
   * @returns Observable that emits the user profile
   */
  getProfile(forceRefresh: boolean = false): Observable<Profile> {
    // Return cached profile if available and not forcing refresh
    if (!forceRefresh && this.profileSubject.value) {
      return of(this.profileSubject.value);
    }

    this.loadingSubject.next(true);

    return this.http.get<Profile>(`${this.baseUrl}/Account/profile`).pipe(
      tap((profile) => {
        // Cache the profile
        this.profileSubject.next(profile);
        this.loadingSubject.next(false);
      }),
      catchError((error: any) => {
        this.loadingSubject.next(false);
        
        // If error occurs, clear tokens and redirect to login
        // This handles authentication failures (401, 403, etc.)
        const status = error?.status || error?.originalError?.status;
        if (status === 401 || status === 403) {
          this.authService.clearTokens();
          this.profileSubject.next(null); // Clear cached profile
          this.router.navigate(['/auth/login']);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Clears the cached profile
   * Call this when user logs out or session expires
   */
  clearProfile(): void {
    this.profileSubject.next(null);
  }

  /**
   * Changes the user's password
   * @param payload Current and new password
   * @returns Observable that completes when password is changed successfully
   */
  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/Account/change-password`, payload).pipe(
      catchError((error: any) => {
        // If error occurs, clear tokens and redirect to login for auth errors
        const status = error?.status || error?.originalError?.status;
        if (status === 401 || status === 403) {
          this.authService.clearTokens();
          this.profileSubject.next(null);
          this.router.navigate(['/auth/login']);
        }
        return throwError(() => error);
      })
    );
  }
}

