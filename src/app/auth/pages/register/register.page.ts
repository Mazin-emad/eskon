import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { InputFieldComponent } from '../../../shared/input-field/input-field.component';
import { RegisterRequest } from '../../../core/models/auth.models';
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
 * Custom validator to check if passwords match
 */
function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  };
}

/**
 * Registration page component
 * Handles new user registration with email, password, confirm password, first name, and last name
 */
@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputFieldComponent],
  templateUrl: './register.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  loading = signal(false);

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrengthValidator()]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordMatchValidator() });

  /**
   * Gets password validation error message
   */
  getPasswordError(): string {
    const passwordControl = this.form.controls.password;
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
   * Handles form submission for user registration
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const formValue = this.form.getRawValue();
    const payload: RegisterRequest = {
      email: formValue.email,
      password: formValue.password,
      confirmPassword: formValue.confirmPassword,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
    };

    this.auth.register(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Store email in localStorage for verification
          this.auth.pendingEmail = payload.email;
          this.toast.success('Registration successful! Please check your email for the verification link.');
          this.router.navigateByUrl('/auth/verify-email');
        },
        error: () => {
          // Error is already handled by error interceptor
          this.loading.set(false);
        },
        complete: () => {
          this.loading.set(false);
        }
      });
  }
}
