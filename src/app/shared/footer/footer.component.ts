import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="bg-white border-t border-gray-200">
      <div class="container mx-auto px-4 py-6">
        <div class="flex flex-col items-center justify-center gap-2 text-center">
          <p class="text-sm text-gray-600">
            © {{ currentYear }} Renty. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
}


