import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type AppModalVariant = 'info' | 'success' | 'warning' | 'error' | 'confirm';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-modal.component.html',
  styleUrl: './app-modal.component.scss',
})
export class AppModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() message = '';
  @Input() variant: AppModalVariant = 'info';
  @Input() showCancel = false;
  @Input() confirmText = 'Aceptar';
  @Input() cancelText = 'Cancelar';
  @Input() closeLabel = 'Cerrar';
  @Input() closeOnBackdrop = true;

  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.closed.emit();
    }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.closed.emit();
  }

  get variantClass(): string {
    return `modal-shell--${this.variant}`;
  }
}