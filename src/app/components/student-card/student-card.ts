import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Student } from "../../interface/interfaces";

/**
 * Componente de apresentação (dumb/presentational component) responsável
 * exclusivamente por exibir os dados de um aluno dentro de uma coluna do
 * Kanban. Não conhece o board, não conhece o CDK, não faz chamadas HTTP —
 * apenas recebe dados e emite eventos. Isso facilita reuso futuro (ex: um
 * card semelhante em uma tela de busca/filtro) e testes unitários isolados.
 *
 * Observação sobre Drag & Drop: as diretivas `cdkDrag` / `[cdkDragData]`
 * são aplicadas de FORA, no template do KanbanBoardComponent, diretamente
 * na tag <app-student-card>. Isso mantém toda a orquestração de
 * drag-and-drop (quem pode arrastar, para onde, o que persiste) como
 * responsabilidade exclusiva do board — o card não precisa saber que
 * está dentro de uma lista arrastável.
 */
@Component({
  selector: 'app-student-card',
  standalone: true,
  templateUrl: './student-card.html',
  styleUrl: './student-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'student-card'
  }
})
export class StudentCard {
  /**
   * `input.required()` garante, em tempo de compilação, que todo consumidor
   * deste componente forneça um aluno — evita checagens defensivas de
   * "student pode ser undefined" espalhadas pelo template.
   */
  readonly student = input.required<Student>();

  /**
   * `output()` é a API moderna que substitui `@Output() = new EventEmitter()`.
   * Comportamento idêntico ao emitir eventos, mas sem depender do RxJS
   * Subject internamente — mais alinhado com o modelo de signals.
   */
  readonly cardClick = output<Student>();

  protected onClick(): void {
    this.cardClick.emit(this.student());
  }

  /**
   * Usado como fallback visual quando o aluno ainda não tem avatarUrl
   * (cenário comum no início do cadastro, antes do upload de foto).
   */
  protected getInitial(): string {
    return this.student().name.charAt(0).toUpperCase();
  }
}