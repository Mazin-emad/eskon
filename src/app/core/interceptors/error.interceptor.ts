import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/toast/toast.service';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { AccountService } from '../services/account.service';
import { ApiErrorResponse } from '../models/auth.models';

/**
 * Extracts user-friendly error messages from API error response
 * @param apiError The API error response object
 * @returns Array of error messages to display
 */
function extractErrorMessages(apiError: ApiErrorResponse): string[] {
  const messages: string[] = [];

  if (!apiError) {
    return messages;
  }

  // Handle errors field
  if (apiError.errors) {
    // Case 1: errors is an array of strings (e.g., ["ErrorCode", "Error message"])
    if (Array.isArray(apiError.errors)) {
      // Get the last element which is usually the user-friendly message
      const lastMessage = apiError.errors[apiError.errors.length - 1];
      if (lastMessage && typeof lastMessage === 'string') {
        messages.push(lastMessage);
      }
    }
    // Case 2: errors is an object with field names as keys (e.g., { "Email": ["Error 1", "Error 2"] })
    else if (typeof apiError.errors === 'object') {
      const errorObj = apiError.errors as Record<string, string[]>;
      // Collect all error messages from all fields
      Object.keys(errorObj).forEach(field => {
        const fieldErrors = errorObj[field];
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach(err => {
            if (err && typeof err === 'string') {
              messages.push(err);
            }
          });
        }
      });
    }
  }

  // Fallback to title or message if no errors found
  if (messages.length === 0) {
    if (apiError.title) {
      messages.push(apiError.title);
    } else if (apiError.message) {
      messages.push(apiError.message);
    }
  }

  return messages;
}

/**
 * Formats error messages for display
 * @param messages Array of error messages
 * @returns Formatted error message string
 */
function formatErrorMessage(messages: string[]): string {
  if (messages.length === 0) {
    return 'An unexpected error occurred';
  }
  
  // If multiple messages, join them with semicolons for better readability
  // For toast notifications, we'll show all messages separated by semicolons
  if (messages.length === 1) {
    return messages[0];
  }
  
  // Join multiple messages with semicolons
  return messages.join('; ');
}

/**
 * Global HTTP error interceptor
 * Handles HTTP errors centrally and provides user-friendly error messages
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const router = inject(Router);
  const authService = inject(AuthService);
  const accountService = inject(AccountService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message || 'A client-side error occurred';
      } else {
        // Server-side error
        const apiError = error.error as ApiErrorResponse;
        
        // Extract error messages from API response
        const errorMessages = extractErrorMessages(apiError);
        
        if (errorMessages.length > 0) {
          errorMessage = formatErrorMessage(errorMessages);
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check your connection.';
        } else if (error.status === 401) {
          // Unauthorized - clear tokens synchronously (don't call logout() to avoid HTTP request in interceptor)
          authService.clearTokens();
          accountService.clearProfile(); // Clear cached profile
          router.navigate(['/auth/login']);
          
          // Use API error message if available, otherwise default
          if (errorMessages.length > 0) {
            errorMessage = formatErrorMessage(errorMessages);
          } else {
            errorMessage = 'Your session has expired. Please login again.';
          }
        } else if (error.status === 403) {
          errorMessage = errorMessages.length > 0 
            ? formatErrorMessage(errorMessages)
            : 'You do not have permission to perform this action.';
        } else if (error.status === 404) {
          errorMessage = errorMessages.length > 0
            ? formatErrorMessage(errorMessages)
            : 'The requested resource was not found.';
        } else if (error.status === 409) {
          // Conflict - use API error message
          errorMessage = errorMessages.length > 0
            ? formatErrorMessage(errorMessages)
            : 'A conflict occurred. Please try again.';
        } else if (error.status === 500) {
          errorMessage = 'A server error occurred. Please try again later.';
        } else {
          // For other status codes, try to use API error message
          errorMessage = errorMessages.length > 0
            ? formatErrorMessage(errorMessages)
            : (error.message || `Error ${error.status}: ${error.statusText}`);
        }
      }

      // Show error toast
      toastService.error(errorMessage);

      // Return error to be handled by the calling service
      // Include the full error object so components can access detailed error information
      return throwError(() => ({
        message: errorMessage,
        originalError: error,
        apiError: error.error as ApiErrorResponse
      }));
    })
  );
};

