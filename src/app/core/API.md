# API Implementation Documentation

## Overview

This document describes the authentication and account API implementation following Angular best practices.

## Structure

### Environment Configuration
- **Location**: `src/environments/`
- **Files**:
  - `environment.ts` - Development configuration
  - `environment.prod.ts` - Production configuration
- **Usage**: Import via `EnvironmentConfig` class from `src/app/core/config/environment.config.ts`

### Models
- **Location**: `src/app/core/models/auth.models.ts`
- **Contains**: All TypeScript interfaces for request/response data schemes

### Services

#### AuthService
- **Location**: `src/app/auth/services/auth.service.ts`
- **Endpoints**:
  - `POST /Auth` - Login
  - `POST /Auth/register` - Register
  - `POST /Auth/refresh` - Refresh access token
  - `POST /Auth/revoke-refresh-token` - Revoke refresh token
  - `POST /Auth/confirm-email` - Confirm email
  - `POST /Auth/resend-confirmation-email` - Resend confirmation email
  - `POST /Auth/forget-password` - Request password reset
  - `POST /Auth/reset-password` - Reset password

#### AccountService
- **Location**: `src/app/core/services/account.service.ts`
- **Endpoints**:
  - `GET /Account/profile` - Get user profile
  - `PUT /Account/change-password` - Change password

### Interceptors

#### Token Interceptor
- **Location**: `src/app/auth/services/token.interceptor.ts`
- **Purpose**: Automatically adds Bearer token to all HTTP requests

#### Error Interceptor
- **Location**: `src/app/core/interceptors/error.interceptor.ts`
- **Purpose**: Centralized HTTP error handling with user-friendly messages

## Usage Examples

### Login
```typescript
import { AuthService } from './auth/services/auth.service';
import { LoginRequest } from './core/models/auth.models';

const authService = inject(AuthService);

const payload: LoginRequest = {
  email: 'user@example.com',
  password: 'password123'
};

authService.login(payload).subscribe({
  next: (response) => {
    // Tokens are automatically stored
    console.log('Login successful');
  },
  error: (error) => {
    // Error is handled by error interceptor
  }
});
```

### Get Profile
```typescript
import { AccountService } from './core/services/account.service';

const accountService = inject(AccountService);

accountService.getProfile().subscribe({
  next: (profile) => {
    console.log('Profile:', profile);
  }
});
```

## Best Practices Implemented

1. **RxJS Observables**: All API calls return Observables instead of Promises
2. **Error Handling**: Centralized error handling via HTTP interceptor
3. **Type Safety**: Strong typing with TypeScript interfaces
4. **Environment Configuration**: Centralized API base URL configuration
5. **Token Management**: Automatic token injection via interceptor
6. **Documentation**: JSDoc comments on all public methods
7. **Memory Management**: Using `takeUntilDestroyed()` to prevent memory leaks

## Notes

- All services use `providedIn: 'root'` for singleton pattern
- Error interceptor automatically shows toast notifications
- 401 errors automatically log out user and redirect to login
- Tokens are stored in localStorage (accessToken and refreshToken)

