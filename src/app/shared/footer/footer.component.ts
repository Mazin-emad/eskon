import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="bg-gray-900 text-gray-300">
      <div class="container mx-auto px-4 py-10">
        <div class="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded bg-blue-500"></div>
            <span class="font-semibold text-white">Renty</span>
          </div>
          <div class="flex items-center gap-6 text-sm">
            <a routerLink="/privacy" class="hover:text-white">Privacy Policy</a>
            <a routerLink="/terms" class="hover:text-white">Terms</a>
            <a routerLink="/contact" class="hover:text-white">Contact</a>
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-6">© {{ currentYear }} Renty. All rights reserved.</div>
      </div>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
}


