import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-student-details',
  standalone: true,
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Estado da aba selecionada
  protected readonly activeTab = signal<{ id: number, label: string }>({ id: 1, label: 'Atividades'});

  // Abas genéricas para o protótipo
  protected readonly tabs = [
    { id: 1, label: 'Atividades' },
    { id: 2, label: 'Contato' },
    { id: 3, label: 'Empresa' },
    { id: 4, label: 'Negócio' },
    { id: 5, label: 'Conversas' },
    { id: 6, label: 'Arquivos' },
    { id: 7, label: 'Histórico' }
  ];

  // Armazena o ID do aluno lido da rota
  protected readonly studentId = signal<string | null>(null);

  ngOnInit(): void {
    // Lê o parâmetro ':id' da URL reativamente
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params.get('id');
        this.studentId.set(id);

        // Futuramente: aqui faremos this.kanbanService.getStudentById(id)
      });
  }

  protected goBack(): void {
    this.router.navigate(['/']); // Retorna ao quadro Kanban
  }

  protected setTab(tab: { id: number, label: string }): void {
    this.activeTab.set(tab);
  }
}