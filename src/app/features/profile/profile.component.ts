import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { InputFieldComponent } from '../../shared/input-field/input-field.component';
import { ChangePasswordRequest, Profile } from '../../core/models/auth.models';
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
 * Profile page component
 * Displays user profile information and allows password change
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputFieldComponent],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  profile = signal<Profile | null>(null);
  loading = signal(false);
  changingPassword = signal(false);

  changePasswordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, passwordStrengthValidator()]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: this.passwordMatchValidator() });

  /**
   * Initializes the component and loads user profile
   */
  ngOnInit(): void {
    // Redirect to login if not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Subscribe to profile changes
    this.accountService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        this.profile.set(profile);
      });

    // Load profile
    this.loading.set(true);
    this.accountService
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          // Error handling is done in AccountService
        },
      });
  }

  /**
   * Custom validator to check if passwords match
   */
  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const newPassword = control.get('newPassword');
      const confirmPassword = control.get('confirmPassword');

      if (!newPassword || !confirmPassword) {
        return null;
      }

      return newPassword.value === confirmPassword.value
        ? null
        : { passwordMismatch: true };
    };
  }

  /**
   * Gets password validation error message
   */
  getPasswordError(): string {
    const passwordControl = this.changePasswordForm.controls.newPassword;
    if (!passwordControl.touched || !passwordControl.errors) {
      return '';
    }

    const errors = passwordControl.errors;
    if (errors['required']) {
      return 'New password is required';
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
   * Handles password change form submission
   */
  onChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const formValue = this.changePasswordForm.value;
    const payload: ChangePasswordRequest = {
      currentPassword: formValue.currentPassword!,
      newPassword: formValue.newPassword!,
    };

    this.changingPassword.set(true);
    this.accountService
      .changePassword(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Password changed successfully');
          this.changePasswordForm.reset();
          this.changingPassword.set(false);
        },
        error: () => {
          this.changingPassword.set(false);
          // Error handling is done in AccountService and error interceptor
        },
      });
  }
}

