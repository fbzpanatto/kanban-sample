import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ErrorDialogService } from '../../services/error-dialog';

/**
 * Modal global de erro de negócio. Vive UMA ÚNICA VEZ no shell da
 * aplicação (ver app.html) — qualquer chamada ao FetchData em qualquer
 * tela do sistema que resulte em businessError abre este mesmo modal,
 * sem precisar declarar nada a mais em cada componente.
 */
@Component({
  selector: 'app-error-dialog',
  standalone: true,
  templateUrl: './error-dialog.html',
  styleUrl: './error-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorDialog {
  protected readonly errorDialogService = inject(ErrorDialogService);

  protected close(): void {
    this.errorDialogService.close();
  }
}