import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../shared/toast/toast.service';
import { InputFieldComponent } from '../../shared/input-field/input-field.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { ProblemAndSolutionComponent } from './problem-and-solution.component';

/**
 * Team member interface
 */
export interface TeamMember {
  name: string;
  title: string;
  image: string;
  socialMedia: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    email?: string;
  };
}

/**
 * Contact form interface for Web3Forms
 */
interface ContactFormData {
  access_key: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  from_name?: string;
}

/**
 * About Us page component
 * Marketing page showcasing Eskon and its solution to the Egyptian housing market
 */
@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    InputFieldComponent,
    ProblemAndSolutionComponent,
  ],
  templateUrl: './about-us.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutUsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  // Web3Forms access key from environment configuration
  private readonly web3formsAccessKey = environment.web3formsAccessKey;

  submitting = signal(false);
  submitted = signal(false);

  contactForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    subject: ['', [Validators.required, Validators.minLength(3)]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });
  /**
   * Team members data
   */
  teamMembers: TeamMember[] = [
    {
      name: 'Ahmed Mohamed',
      title: 'CEO & Founder',
      image:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      socialMedia: {
        linkedin: 'https://linkedin.com/in/ahmed-mohamed',
        twitter: 'https://twitter.com/ahmed_mohamed',
        email: 'ahmed@eskon.com',
      },
    },
    {
      name: 'Fatma Hassan',
      title: 'CTO',
      image:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      socialMedia: {
        linkedin: 'https://linkedin.com/in/fatma-hassan',
        github: 'https://github.com/fatma-hassan',
        email: 'fatma@eskon.com',
      },
    },
    {
      name: 'Mohamed Ali',
      title: 'Head of Product',
      image:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
      socialMedia: {
        linkedin: 'https://linkedin.com/in/mohamed-ali',
        twitter: 'https://twitter.com/mohamed_ali',
        email: 'mohamed@eskon.com',
      },
    },
    {
      name: 'Sara Ibrahim',
      title: 'Head of Marketing',
      image:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      socialMedia: {
        linkedin: 'https://linkedin.com/in/sara-ibrahim',
        twitter: 'https://twitter.com/sara_ibrahim',
        email: 'sara@eskon.com',
      },
    },
  ];

  /**
   * Handles contact form submission
   */
  onSubmitContactForm(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    if (
      !this.web3formsAccessKey ||
      this.web3formsAccessKey === 'YOUR_WEB3FORMS_ACCESS_KEY'
    ) {
      this.toast.error(
        'Please configure Web3Forms access key in environment configuration'
      );
      return;
    }

    this.submitting.set(true);
    const formValue = this.contactForm.getRawValue();

    const payload: ContactFormData = {
      access_key: this.web3formsAccessKey,
      name: formValue.name,
      email: formValue.email,
      subject: formValue.subject,
      message: formValue.message,
      from_name: 'Eskon Contact Form',
    };

    this.http
      .post('https://api.web3forms.com/submit', payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.toast.success(
              'Thank you! Your message has been sent successfully.'
            );
            this.contactForm.reset();
            this.submitted.set(true);
            // Reset submitted flag after 5 seconds
            setTimeout(() => {
              this.submitted.set(false);
            }, 5000);
          } else {
            this.toast.error('Failed to send message. Please try again.');
          }
          this.submitting.set(false);
        },
        error: () => {
          this.toast.error(
            'An error occurred while sending your message. Please try again.'
          );
          this.submitting.set(false);
        },
      });
  }
}
