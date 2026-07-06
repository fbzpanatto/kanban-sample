import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { FetchData } from '../../services/fetch-data';
import { Stage, Student } from '../../interface/interfaces';
import { StudentCard } from '../student-card/student-card';
import { Filters } from "../filters/filters";

interface ColumnViewModel { stage: Stage, students: Student[] }

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [DragDropModule, ReactiveFormsModule, StudentCard, Filters],
  templateUrl: './kanban.html',
  styleUrl: './kanban.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanbanBoardComponent implements OnInit {
  private readonly kanbanService = inject(FetchData);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly columns = signal<ColumnViewModel[]>([]);

  protected readonly totalStudentsCount = signal(0);

  protected readonly searchControl = new FormControl('', { nonNullable: true });

  protected readonly connectedColumnIds = computed(() =>
    this.columns().map((column) => this.getColumnListId(column.stage.id))
  );

  ngOnInit(): void {
    this.loadBoard();
    this.watchSearchTerm();
  }

  private watchSearchTerm(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((term) =>
          this.kanbanService.searchStudents(term).pipe(
            catchError(() => {
              this.errorMessage.set('Não foi possível buscar os alunos.');
              return of<Student[]>([]);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((students) => this.rebuildColumns(students));
  }

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

    this.columns.set([...this.columns()]);
  }

  protected onCardClick(student: Student): void {
    console.log('Abrir detalhes do aluno:', student.id);
    // TODO: navegar para rota de detalhes ou abrir modal (fora do escopo desta fase)
  }

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