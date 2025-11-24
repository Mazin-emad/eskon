import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  ControlContainer,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <label class="block">
      <span class="block text-sm font-medium text-gray-700 mb-1">{{
        label
      }}</span>
      <input
        [attr.type]="type"
        [attr.placeholder]="placeholder"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900"
        [formControlName]="controlName"
      />
    </label>
    @if (error) {
    <p class="mt-1 text-xs text-red-600">{{ error }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    { provide: ControlContainer, useExisting: FormGroupDirective },
  ],
})
export class InputFieldComponent {
  @Input() label = '';
  @Input() type: string = 'text';
  @Input() placeholder = '';
  @Input() controlName: string = '';
  @Input() error?: string;
}
