import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { InputFieldComponent } from '../../../shared/input-field/input-field.component';
import { ForgetPasswordRequest } from '../../../core/models/auth.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Password reset request page component
 * Handles requesting a password reset email (similar to register page)
 */
@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputFieldComponent],
  templateUrl: './reset-password.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  loading = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  /**
   * Requests a password reset email
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const payload: ForgetPasswordRequest = this.form.getRawValue();

    this.auth.forgetPassword(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Store email in localStorage for reset page (similar to register flow)
          this.auth.pendingResetEmail = payload.email;
          this.toast.success('Password reset email sent. Please check your inbox.');
          // Redirect to a confirmation page (similar to verify-email)
          // The actual reset will happen when user clicks the link in email
          this.router.navigateByUrl('/auth/forgetPassword');
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
