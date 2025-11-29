/**
 * Authentication and account related data models
 */

/**
 * Request payload for user login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Request payload for user registration
 */
export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

/**
 * Request payload for refreshing authentication token
 */
export interface RefreshTokenRequest {
  Token: string; // Access token (capitalized as per API spec)
  RefreshToken: string; // Refresh token (capitalized as per API spec)
}

/**
 * Request payload for confirming email address
 */
export interface ConfirmEmailRequest {
  email: string;
  code: string;
}

/**
 * Request payload for resending confirmation email
 */
export interface ResendConfirmationEmailRequest {
  email: string;
}

/**
 * Request payload for requesting password reset
 */
export interface ForgetPasswordRequest {
  email: string;
}

/**
 * Request payload for resetting password
 */
export interface ResetPasswordRequest {
  Code: string; // Reset code from email link
  Email: string; // User's email address
  NewPassword: string; // New password
}

/**
 * Request payload for changing password
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Authentication response containing tokens and user information
 */
export interface AuthResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  token: string; // Access token (JWT)
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiration: string;
}

/**
 * User profile information returned from /Account/profile
 */
export interface Profile {
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
}

/**
 * @deprecated Use Profile instead
 * Legacy interface name for backward compatibility
 */
export type UserProfile = Profile;

/**
 * API error response structure
 * Errors can be either:
 * - An array of strings: ["ErrorCode", "Error message"]
 * - An object with field names as keys and arrays of error messages: { "Email": ["Error 1", "Error 2"] }
 */
export interface ApiErrorResponse {
  type?: string;
  title?: string;
  status?: number;
  errors?: string[] | Record<string, string[]>;
  traceId?: string;
  message?: string;
  statusCode?: number;
}
