import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed top-4 inset-x-0 flex flex-col items-center gap-2 z-50 pointer-events-none"
    >
      <div
        *ngFor="let m of toast.messages$ | async"
        class="pointer-events-auto w-full max-w-md px-4"
      >
        <div
          class="rounded-lg shadow border p-3"
          [class.bg-green-50]="m.type === 'success'"
          [class.border-green-200]="m.type === 'success'"
          [class.text-green-900]="m.type === 'success'"
          [class.bg-red-50]="m.type === 'error'"
          [class.border-red-200]="m.type === 'error'"
          [class.text-red-900]="m.type === 'error'"
          [class.bg-blue-50]="m.type === 'info'"
          [class.border-blue-200]="m.type === 'info'"
          [class.text-blue-900]="m.type === 'info'"
        >
          <div class="flex justify-between items-start gap-4">
            <div class="text-sm">{{ m.text }}</div>
            <button
              class="text-xs text-gray-500 hover:text-gray-700"
              (click)="toast.dismiss(m.id)"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
