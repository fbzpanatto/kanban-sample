import { Injectable, signal } from '@angular/core';

/**
 * Service minúsculo, só com estado: guarda a mensagem de erro de negócio
 * atual (ou null, se nenhum modal deve estar aberto). Não conhece HTTP,
 * não conhece nenhum componente específico — só existe pra desacoplar
 * "quem detecta o erro" (FetchData) de "quem exibe o modal" (ErrorDialog,
 * um componente global vivendo uma vez só no shell da aplicação).
 *
 * Equivalente enxuto do DialogMessagesService da aplicação final — sem
 * as dependências extras (Router, FormService, etc.) que não fazem
 * sentido nesta fase do protótipo.
 */
@Injectable({ providedIn: 'root' })
export class ErrorDialogService {
  readonly message = signal<string | null>(null);

  show(message: string): void {
    this.message.set(message);
  }

  close(): void {
    this.message.set(null);
  }
}