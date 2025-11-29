import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { InputFieldComponent } from '../../../shared/input-field/input-field.component';
import { ForgetPasswordRequest, ResetPasswordRequest } from '../../../core/models/auth.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Custom validator for password strength
 * Requires: minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character
 */
function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Don't validate empty values (use required validator for that)
    }

    const password = control.value as string;
    const errors: ValidationErrors = {};

    if (password.length < 8) {
      errors['minLength'] = true;
    }

    if (!/[A-Z]/.test(password)) {
      errors['uppercase'] = true;
    }

    if (!/[a-z]/.test(password)) {
      errors['lowercase'] = true;
    }

    if (!/[0-9]/.test(password)) {
      errors['number'] = true;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors['specialChar'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };
}

/**
 * Password reset page component
 * Handles password reset using email and code from query parameters (similar to verify-email flow)
 */
@Component({
  selector: 'app-forget-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputFieldComponent],
  templateUrl: './forget-password.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgetPasswordPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  loading = signal(false);
  resending = signal(false);
  resetStatus = signal<'idle' | 'success' | 'error'>('idle');
  emailFromQuery = signal<string | null>(null);
  codeFromQuery = signal<string | null>(null);

  resendForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, passwordStrengthValidator()]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: this.passwordMatchValidator() });

  /**
   * Custom validator to check if passwords match
   */
  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('newPassword');
      const confirmPassword = control.get('confirmPassword');

      if (!password || !confirmPassword) {
        return null;
      }

      return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    };
  }

  /**
   * Initializes the component and checks for query parameters
   */
  ngOnInit(): void {
    // Pre-fill email from localStorage if available
    const storedEmail = this.auth.pendingResetEmail;
    if (storedEmail) {
      this.resendForm.patchValue({ email: storedEmail });
    }

    // Check for query parameters (email and code)
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const email = params['email'];
        const code = params['code'];

        // Store query params
        this.emailFromQuery.set(email || null);
        this.codeFromQuery.set(code || null);

        // If both email and code are present, show reset form
        if (email && code) {
          // Pre-fill email in resend form
          this.resendForm.patchValue({ email });
          // Store email in localStorage
          this.auth.pendingResetEmail = email;
        } else if (code && !email) {
          // If code exists but no email, try to use stored email
          const storedEmail = this.auth.pendingResetEmail;
          if (storedEmail) {
            this.emailFromQuery.set(storedEmail);
            this.resendForm.patchValue({ email: storedEmail });
          } else {
            this.resetStatus.set('error');
            this.toast.error('Email not found. Please enter your email and resend the reset link.');
          }
        }
      });
  }

  /**
   * Gets password validation error message
   */
  getPasswordError(): string {
    const passwordControl = this.resetForm.controls.newPassword;
    if (!passwordControl.touched || !passwordControl.errors) {
      return '';
    }

    const errors = passwordControl.errors;
    if (errors['required']) {
      return 'Password is required';
    }
    if (errors['minLength']) {
      return 'Minimum 8 characters required';
    }
    if (errors['uppercase']) {
      return 'At least one uppercase letter required';
    }
    if (errors['lowercase']) {
      return 'At least one lowercase letter required';
    }
    if (errors['number']) {
      return 'At least one number required';
    }
    if (errors['specialChar']) {
      return 'At least one special character required';
    }
    return 'Password does not meet requirements';
  }

  /**
   * Resets the password using email and code
   */
  resetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const email = this.emailFromQuery();
    const code = this.codeFromQuery();

    if (!email || !code) {
      this.toast.error('Missing email or reset code. Please use the link from your email.');
      return;
    }

    this.loading.set(true);
    this.resetStatus.set('idle');
    const payload: ResetPasswordRequest = {
      Code: code,
      Email: email,
      NewPassword: this.resetForm.controls.newPassword.value,
    };

    this.auth.resetPassword(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Clear pending reset email from localStorage after successful reset
          this.auth.pendingResetEmail = null;
          this.resetStatus.set('success');
          this.toast.success('Password reset successfully! You can now login.');
          // Redirect to login after a short delay to show success message
          setTimeout(() => {
            this.router.navigateByUrl('/auth/login');
          }, 2000);
        },
        error: (error) => {
          // Error is already handled by error interceptor, but we also set status
          this.resetStatus.set('error');
          this.loading.set(false);
        },
        complete: () => {
          this.loading.set(false);
        }
      });
  }

  /**
   * Resends the password reset email
   */
  resendEmail(): void {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.resending.set(true);
    const payload: ForgetPasswordRequest = this.resendForm.getRawValue();

    this.auth.forgetPassword(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Store email in localStorage for reset
          this.auth.pendingResetEmail = payload.email;
          this.emailFromQuery.set(payload.email);
          this.toast.success('Password reset email sent. Please check your inbox.');
        },
        error: () => {
          // Error is already handled by error interceptor
          this.resending.set(false);
        },
        complete: () => {
          this.resending.set(false);
        }
      });
  }
}

