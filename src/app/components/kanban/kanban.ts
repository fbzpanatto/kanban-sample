import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { FetchData } from '../../services/fetch-data';
import { Stage, Student } from '../../interface/interfaces';
import { StudentCard } from '../student-card/student-card';

/**
 * Modelo de visualização: uma etapa (coluna) já com a lista de alunos
 * que pertencem a ela. É o formato que o template consome diretamente.
 */
interface ColumnViewModel {
  stage: Stage;
  students: Student[];
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [DragDropModule, ReactiveFormsModule, StudentCard],
  templateUrl: './kanban.html',
  styleUrl: './kanban.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanbanBoardComponent implements OnInit {
  private readonly kanbanService = inject(FetchData);
  private readonly destroyRef = inject(DestroyRef);

  // --- Estado do componente (signals) ---
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly columns = signal<ColumnViewModel[]>([]);

  /**
   * Totalizador exibido no topo do quadro (equivalente ao "34 oportunidades
   * de Negócio" do modelo de referência). É definido UMA vez, na carga
   * inicial, e não muda quando o usuário filtra por nome — representa o
   * total real de alunos no quadro, não o resultado da busca.
   */
  protected readonly totalStudentsCount = signal(0);

  /**
   * Campo de busca por nome. `nonNullable: true` evita que o valor seja
   * `string | null` — o FormControl sempre terá uma string (mesmo que
   * vazia), o que simplifica a tipagem no restante do fluxo.
   */
  protected readonly searchControl = new FormControl('', { nonNullable: true });

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
    this.watchSearchTerm();
  }

  /**
   * Observa o campo de busca e dispara `searchStudents` no service sempre
   * que o termo "assentar" por 400ms (debounceTime) e for realmente
   * diferente do último termo buscado (distinctUntilChanged) — evita
   * requisição a cada tecla digitada e evita repetir a mesma busca (ex:
   * usuário digita e apaga rápido, voltando ao mesmo texto).
   *
   * `switchMap` cancela automaticamente uma busca anterior ainda em voo
   * se o usuário digitar de novo antes dela responder — evita que uma
   * resposta antiga e mais lenta chegue depois e sobrescreva um
   * resultado mais recente (race condition clássica de autocomplete).
   */
  private watchSearchTerm(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((term) =>
          this.kanbanService.searchStudents(term).pipe(
            catchError(() => {
              // Importante: o catchError fica AQUI DENTRO do switchMap,
              // isolado por busca. Se ficasse fora (no pipe externo),
              // um único erro encerraria o Observable de valueChanges
              // inteiro, e a busca pararia de responder pelo resto da
              // sessão do usuário.
              this.errorMessage.set('Não foi possível buscar os alunos.');
              return of<Student[]>([]);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((students) => this.rebuildColumns(students));
  }

  /**
   * Reagrupa os alunos retornados pela busca dentro das colunas/etapas já
   * carregadas. Reaproveita os objetos `Stage` que já estão em `columns()`
   * em vez de manter uma lista de estágios duplicada em outro signal.
   */
  private rebuildColumns(students: Student[]): void {
    const stages = this.columns().map((column) => column.stage);

    this.columns.set(
      stages.map((stage) => ({
        stage,
        students: students.filter((student) => student.stageId === stage.id)
      }))
    );
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
        this.totalStudentsCount.set(students.length);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar os alunos.');
        this.loading.set(false);
      }
    });
  }
}