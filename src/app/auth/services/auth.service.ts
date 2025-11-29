import { HttpClient } from '@angular/common/http';
import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { EnvironmentConfig } from '../../core/config/environment.config';
import {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ConfirmEmailRequest,
  ResendConfirmationEmailRequest,
  ForgetPasswordRequest,
  ResetPasswordRequest,
  AuthResponse,
} from '../../core/models/auth.models';

/**
 * Cookie utility functions
 */
function setCookie(name: string, value: string, expires: Date): void {
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * Authentication service
 * Handles all authentication-related API calls including login, registration,
 * email confirmation, password reset, and token management with automatic token refresh
 */
@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = EnvironmentConfig.apiBaseUrl;

  private readonly accessTokenKey = 'accessToken';
  private readonly refreshTokenKey = 'refreshToken';
  private readonly pendingEmailKey = 'pendingEmail';
  private readonly pendingResetEmailKey = 'pendingResetEmail';
  private readonly tokenExpirationCookieKey = 'tokenExpiration';

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Gets the current access token from localStorage
   * @returns The access token or null if not found
   */
  get accessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  /**
   * Sets the access token in localStorage
   * @param value The access token to store
   */
  set accessToken(value: string | null) {
    if (value) {
      localStorage.setItem(this.accessTokenKey, value);
    } else {
      localStorage.removeItem(this.accessTokenKey);
    }
  }

  /**
   * Gets the current refresh token from localStorage
   * @returns The refresh token or null if not found
   */
  get refreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  /**
   * Sets the refresh token in localStorage
   * @param value The refresh token to store
   */
  set refreshToken(value: string | null) {
    if (value) {
      localStorage.setItem(this.refreshTokenKey, value);
    } else {
      localStorage.removeItem(this.refreshTokenKey);
    }
  }

  /**
   * Legacy token getter for backward compatibility
   * @deprecated Use accessToken instead
   */
  get token(): string | null {
    return this.accessToken;
  }

  /**
   * Legacy token setter for backward compatibility
   * @deprecated Use accessToken instead
   */
  set token(value: string | null) {
    this.accessToken = value;
  }

  /**
   * Authenticates a user with email and password
   * @param payload Login credentials
   * @returns Observable that emits the authentication response
   */
  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/Auth`, payload).pipe(
      tap((response) => {
        // Store tokens in localStorage
        this.accessToken = response.token; // API returns 'token' not 'accessToken'
        this.refreshToken = response.refreshToken;
        // Store expiration date in cookie
        this.storeTokenExpiration(response.expiresIn);
        // Schedule automatic token refresh
        this.scheduleTokenRefresh(response.expiresIn);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Registers a new user
   * @param payload Registration data
   * @returns Observable that completes when registration is successful
   */
  register(payload: RegisterRequest): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/Auth/register`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Refreshes the access token using a refresh token
   * @param payload Optional refresh token request (if not provided, uses current tokens)
   * @returns Observable that emits the new authentication response
   */
  refreshAccessToken(payload?: RefreshTokenRequest): Observable<AuthResponse> {
    const currentToken = this.accessToken;
    const currentRefreshToken = this.refreshToken;

    if (!currentToken || !currentRefreshToken) {
      return throwError(() => new Error('No tokens available for refresh'));
    }

    // Use provided payload or create from current tokens
    const refreshPayload: RefreshTokenRequest = payload || {
      Token: currentToken,
      RefreshToken: currentRefreshToken,
    };

    return this.http
      .post<AuthResponse>(`${this.baseUrl}/Auth/refresh`, refreshPayload)
      .pipe(
        tap((response) => {
          // Store tokens in localStorage
          this.accessToken = response.token; // API returns 'token' not 'accessToken'
          this.refreshToken = response.refreshToken;
          // Store expiration date in cookie
          this.storeTokenExpiration(response.expiresIn);
          // Schedule automatic token refresh
          this.scheduleTokenRefresh(response.expiresIn);
        }),
        catchError((error) => {
          // If refresh fails, clear tokens
          this.clearTokens();
          this.clearRefreshTimer();
          return throwError(() => error);
        })
      );
  }

  /**
   * Revokes a refresh token
   * @param payload Optional refresh token request (if not provided, uses current tokens)
   * @returns Observable that completes when the token is revoked
   */
  revokeRefreshToken(payload?: RefreshTokenRequest): Observable<void> {
    const currentToken = this.accessToken;
    const currentRefreshToken = this.refreshToken;

    if (!currentToken || !currentRefreshToken) {
      // If no tokens, return success immediately
      return new Observable<void>((observer) => {
        observer.next();
        observer.complete();
      });
    }

    // Use provided payload or create from current tokens
    const revokePayload: RefreshTokenRequest = payload || {
      Token: currentToken,
      RefreshToken: currentRefreshToken,
    };

    return this.http
      .post<void>(`${this.baseUrl}/Auth/revoke-refresh-token`, revokePayload)
      .pipe(
        tap(() => {
          // Clear tokens after revocation
          this.clearTokens();
          this.clearRefreshTimer();
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Confirms a user's email address using a confirmation token
   * @param payload Email confirmation token
   * @returns Observable that completes when email is confirmed
   */
  confirmEmail(payload: ConfirmEmailRequest): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/Auth/confirm-email`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Resends the email confirmation email
   * @param payload Email address to resend confirmation to
   * @returns Observable that completes when email is sent
   */
  resendConfirmationEmail(
    payload: ResendConfirmationEmailRequest
  ): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/Auth/resend-confirmation-email`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Requests a password reset email
   * @param payload Email address for password reset
   * @returns Observable that completes when reset email is sent
   */
  forgetPassword(payload: ForgetPasswordRequest): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/Auth/forget-password`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Resets the user's password using a reset token
   * @param payload Password reset token and new password
   * @returns Observable that completes when password is reset
   */
  resetPassword(payload: ResetPasswordRequest): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/Auth/reset-password`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Logs out the current user and clears tokens
   * Note: Profile cache should be cleared separately via AccountService.clearProfile()
   * @returns Observable that completes when logout is successful
   */
  logout(): Observable<void> {
    const currentToken = this.accessToken;
    const refreshToken = this.refreshToken;

    // Clear tokens immediately
    this.clearTokens();
    this.clearRefreshTimer();

    // If we have tokens, try to revoke refresh token
    if (currentToken && refreshToken) {
      return this.revokeRefreshToken({
        Token: currentToken,
        RefreshToken: refreshToken,
      }).pipe(
        catchError(() => {
          // Even if revocation fails, logout is considered successful
          return new Observable<void>((observer) => {
            observer.next();
            observer.complete();
          });
        })
      );
    }

    // If no tokens, return immediately
    return new Observable<void>((observer) => {
      observer.next();
      observer.complete();
    });
  }

  /**
   * Checks if the user is currently authenticated
   * @returns True if an access token exists, false otherwise
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Clears all authentication tokens from storage synchronously
   * Use this method when you need to clear tokens without making HTTP requests
   * (e.g., from interceptors to avoid circular dependencies)
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    deleteCookie(this.tokenExpirationCookieKey);
    this.clearRefreshTimer();
  }

  /**
   * Stores token expiration date in a cookie
   * @param expiresIn Token expiration time in seconds
   */
  private storeTokenExpiration(expiresIn: number): void {
    // Calculate expiration date: current time + expiresIn seconds
    const expirationDate = new Date(Date.now() + expiresIn * 1000);
    setCookie(this.tokenExpirationCookieKey, expirationDate.toISOString(), expirationDate);
  }

  /**
   * Gets the stored token expiration date
   * @returns The expiration date or null if not found
   */
  private getTokenExpiration(): Date | null {
    const expirationStr = getCookie(this.tokenExpirationCookieKey);
    if (!expirationStr) {
      return null;
    }
    const expirationDate = new Date(expirationStr);
    return isNaN(expirationDate.getTime()) ? null : expirationDate;
  }

  /**
   * Schedules automatic token refresh 10 seconds before expiration
   * @param expiresIn Token expiration time in seconds
   */
  private scheduleTokenRefresh(expiresIn: number): void {
    // Clear any existing timer
    this.clearRefreshTimer();

    // Calculate refresh time: expiresIn - 10 seconds (refresh 10 seconds before expiration)
    const refreshInMs = Math.max(0, (expiresIn - 10) * 1000);

    if (refreshInMs <= 0) {
      // If expiration is less than 10 seconds away, refresh immediately
      this.refreshAccessToken().subscribe({
        error: () => {
          // Error handling is done in refreshAccessToken
        },
      });
      return;
    }

    // Schedule refresh
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken().subscribe({
        error: () => {
          // Error handling is done in refreshAccessToken
        },
      });
    }, refreshInMs);
  }

  /**
   * Clears the token refresh timer
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Initializes token refresh mechanism if user is authenticated
   * Should be called on app startup
   */
  initializeTokenRefresh(): void {
    if (!this.isAuthenticated()) {
      return;
    }

    const expirationDate = this.getTokenExpiration();
    if (!expirationDate) {
      // If no expiration date stored, we can't schedule refresh
      // This might happen if tokens were set before this feature was added
      return;
    }

    const now = new Date();
    const expiresInMs = expirationDate.getTime() - now.getTime();
    const expiresInSeconds = Math.floor(expiresInMs / 1000);

    if (expiresInSeconds <= 0) {
      // Token already expired, try to refresh immediately
      this.refreshAccessToken().subscribe({
        error: () => {
          // Error handling is done in refreshAccessToken
        },
      });
    } else {
      // Schedule refresh
      this.scheduleTokenRefresh(expiresInSeconds);
    }
  }

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    this.clearRefreshTimer();
  }

  /**
   * Gets the pending email from localStorage (stored after registration)
   * @returns The pending email or null if not found
   */
  get pendingEmail(): string | null {
    return localStorage.getItem(this.pendingEmailKey);
  }

  /**
   * Sets the pending email in localStorage
   * @param email The email to store
   */
  set pendingEmail(email: string | null) {
    if (email) {
      localStorage.setItem(this.pendingEmailKey, email);
    } else {
      localStorage.removeItem(this.pendingEmailKey);
    }
  }

  /**
   * Gets the pending reset email from localStorage (stored after requesting password reset)
   * @returns The pending reset email or null if not found
   */
  get pendingResetEmail(): string | null {
    return localStorage.getItem(this.pendingResetEmailKey);
  }

  /**
   * Sets the pending reset email in localStorage
   * @param email The email to store
   */
  set pendingResetEmail(email: string | null) {
    if (email) {
      localStorage.setItem(this.pendingResetEmailKey, email);
    } else {
      localStorage.removeItem(this.pendingResetEmailKey);
    }
  }
}
