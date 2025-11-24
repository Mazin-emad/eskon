import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { InputFieldComponent } from '../../../shared/input-field/input-field.component';
import { ConfirmEmailRequest, ResendConfirmationEmailRequest } from '../../../core/models/auth.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Email verification page component
 * Handles email confirmation using userId and code from query parameters
 */
@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputFieldComponent],
  templateUrl: './verify-email.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  loading = signal(false);
  resending = signal(false);
  verificationStatus = signal<'idle' | 'success' | 'error'>('idle');

  resendForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  /**
   * Initializes the component and checks for query parameters
   */
  ngOnInit(): void {
    // Pre-fill email from localStorage if available
    const storedEmail = this.auth.pendingEmail;
    if (storedEmail) {
      this.resendForm.patchValue({ email: storedEmail });
    }

    // Check for query parameters (code)
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const code = params['code'];

        // If code parameter is found, make the verification request
        if (code) {
          const email = this.auth.pendingEmail;
          if (email) {
            // Auto-submit if code and email are available
            this.confirmEmail(email, code);
          } else {
            // If code exists but no email in storage, show error
            this.verificationStatus.set('error');
            this.toast.error('Email not found. Please enter your email and resend the verification link.');
          }
        }
      });
  }

  /**
   * Confirms email with email and code
   */
  private confirmEmail(email: string, code: string): void {
    this.loading.set(true);
    this.verificationStatus.set('idle');
    const payload: ConfirmEmailRequest = { email, code };

    this.auth.confirmEmail(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Clear pending email from localStorage after successful verification
          this.auth.pendingEmail = null;
          this.verificationStatus.set('success');
          this.toast.success('Email verified successfully! You can now login.');
          // Redirect to login after a short delay to show success message
          setTimeout(() => {
            this.router.navigateByUrl('/auth/login');
          }, 2000);
        },
        error: (error) => {
          // Error is already handled by error interceptor, but we also set status
          this.verificationStatus.set('error');
          this.loading.set(false);
        },
        complete: () => {
          this.loading.set(false);
        }
      });
  }

  /**
   * Resends the confirmation email
   */
  resendEmail(): void {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.resending.set(true);
    const payload: ResendConfirmationEmailRequest = this.resendForm.getRawValue();

    this.auth.resendConfirmationEmail(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Store email in localStorage for verification
          this.auth.pendingEmail = payload.email;
          this.toast.success('Confirmation email sent. Please check your inbox.');
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
