import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  readonly messages$ = new BehaviorSubject<ToastMessage[]>([]);

  success(text: string): void {
    this.push({ type: 'success', text });
  }

  error(text: string): void {
    this.push({ type: 'error', text });
  }

  info(text: string): void {
    this.push({ type: 'info', text });
  }

  dismiss(id: number): void {
    this.messages$.next(this.messages$.value.filter(m => m.id !== id));
  }

  private push(input: Omit<ToastMessage, 'id'>): void {
    const id = ++this.counter;
    const message: ToastMessage = { id, ...input };
    this.messages$.next([...this.messages$.value, message]);
    setTimeout(() => this.dismiss(id), 3500);
  }
}


