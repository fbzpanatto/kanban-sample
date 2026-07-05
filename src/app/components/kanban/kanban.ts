import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FetchData } from "../../services/fetch-data";
import { Stage, Student } from '../../interface/interfaces';

interface ColumnViewModel {
  stage: Stage;
  students: Student[];
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './kanban.html',
  styleUrl: './kanban.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanbanBoardComponent implements OnInit {
  private readonly kanbanService = inject(FetchData);

  // --- Estado do componente (signals) ---
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly columns = signal<ColumnViewModel[]>([]);

  /**
   * IDs das listas conectadas para o CDK Drag & Drop.
   * Precisa incluir todas as colunas para permitir arrastar entre
   * quaisquer etapas (não apenas entre colunas adjacentes).
   */
  protected readonly connectedColumnIds = computed(() =>
    this.columns().map((column) => this.getColumnListId(column.stage.id))
  );

  ngOnInit(): void {
    this.loadBoard();
  }

  protected getColumnListId(stageId: number): string {
    return `stage-list-${stageId}`;
  }

  protected trackByStageId(_index: number, column: ColumnViewModel): number {
    return column.stage.id;
  }

  protected trackByStudentId(_index: number, student: Student): number {
    return student.id;
  }

  /**
   * Disparado pelo CDK quando o usuário solta um cartão — seja reordenando
   * dentro da mesma coluna, seja movendo para outra etapa.
   */
  protected onDrop(event: CdkDragDrop<Student[]>, targetStage: Stage): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const student = event.previousContainer.data[event.previousIndex];

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      this.persistStageChange(student, targetStage);
    }

    // O CDK muta os arrays em memória (in-place). Como usamos signals,
    // precisamos "avisar" o Angular criando uma nova referência do array
    // para que o template seja atualizado (essencial com OnPush).
    this.columns.set([...this.columns()]);
  }

  /**
   * Chamada ao clicar em um cartão de aluno.
   * Fase 2: deve abrir a tela/modal de detalhes com as abas do aluno.
   */
  protected onCardClick(student: Student): void {
    console.log('Abrir detalhes do aluno:', student.id);
    // TODO: navegar para rota de detalhes ou abrir modal (fora do escopo desta fase)
  }

  /**
   * Persiste no backend a nova etapa do aluno. Em caso de falha,
   * reverte visualmente o cartão para a coluna original, evitando que
   * a UI fique inconsistente com o banco de dados.
   */
  private persistStageChange(student: Student, targetStage: Stage): void {
    const previousStageId = student.stageId;
    student.stageId = targetStage.id;

    this.kanbanService
      .updateStudentStage({ studentId: student.id, newStageId: targetStage.id })
      .subscribe({
        error: () => {
          student.stageId = previousStageId;
          this.revertStudentToPreviousColumn(student, previousStageId, targetStage.id);
          this.errorMessage.set('Não foi possível mover o aluno. A alteração foi desfeita.');
        }
      });
  }

  private revertStudentToPreviousColumn(
    student: Student,
    previousStageId: number,
    currentStageId: number
  ): void {
    const columns = this.columns();
    const wrongColumn = columns.find((c) => c.stage.id === currentStageId);
    const correctColumn = columns.find((c) => c.stage.id === previousStageId);

    if (!wrongColumn || !correctColumn) {
      return;
    }

    wrongColumn.students = wrongColumn.students.filter((s) => s.id !== student.id);
    correctColumn.students = [...correctColumn.students, student];

    this.columns.set([...columns]);
  }

  private loadBoard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.kanbanService.getStages().subscribe({
      next: (stages) => this.loadStudents(stages),
      error: () => {
        this.errorMessage.set('Não foi possível carregar as etapas do quadro.');
        this.loading.set(false);
      }
    });
  }

  private loadStudents(stages: Stage[]): void {
    this.kanbanService.getStudents().subscribe({
      next: (students) => {
        const sortedStages = [...stages].sort((a, b) => a.order - b.order);

        this.columns.set(
          sortedStages.map((stage) => ({
            stage,
            students: students.filter((student) => student.stageId === stage.id)
          }))
        );
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar os alunos.');
        this.loading.set(false);
      }
    });
  }
}