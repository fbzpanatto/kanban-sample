import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FetchData } from '../../services/fetch-data';
import { ProposalMessage, Stage } from '../../interface/interfaces';

/**
 * Linha "esqueleto" (só visual, sem dado real) da tabela de atividades.
 * Fica local ao componente de propósito: diferente de Stage/ProposalMessage,
 * isso não representa um modelo de domínio que virá da API — é conteúdo
 * de preenchimento visual, então não faz sentido "sujar" o interfaces.ts
 * compartilhado com um tipo que não é real ainda.
 */
interface SkeletonActivityRow {
  id: number;
  day: number;
  date: string;
  description: string;
  done: boolean;
}

@Component({
  selector: 'app-student-details',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fetchData = inject(FetchData);

  private readonly stagesResource = '/stages';

  // Estado da aba selecionada
  protected readonly activeTab = signal<{ id: number; label: string }>({ id: 1, label: 'Atividades' });

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

  // --- Timeline de etapas ---

  protected readonly stages = signal<Stage[]>([]);

  /**
   * Etapa atual do aluno. Por ora, hardcoded — igual ao "Nome do Aluno"
   * placeholder que já existe na sidebar. Quando o componente passar a
   * buscar o aluno real (this.fetchData.getOne<Student>('/kanban/students', id)),
   * troque por student.stageId.
   */
  protected readonly currentStageId = signal<number>(3);

  private readonly currentStageOrder = computed(() => {
    const current = this.stages().find((stage) => stage.id === this.currentStageId());
    return current?.order ?? 0;
  });

  protected readonly timelineTrack = viewChild<ElementRef<HTMLDivElement>>('timelineTrack');

  // --- Esqueleto visual da tabela de atividades (sem função ainda) ---

  protected readonly skeletonActivities: SkeletonActivityRow[] = [
    { id: 1, day: 1, date: '30/06', description: 'Apresentação Proposta', done: false },
    { id: 2, day: 1, date: '30/06', description: 'Enviar contrato', done: false },
    { id: 3, day: 2, date: '01/07', description: 'Follow-up de retorno', done: false }
  ];

  // --- Mensagens da "Apresentação Proposta" ---

  protected readonly messages = signal<ProposalMessage[]>([]);
  protected readonly isMessageModalOpen = signal(false);
  protected readonly messageControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    // Lê o parâmetro ':id' da URL reativamente
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        this.studentId.set(id);

        // Futuramente: this.fetchData.getOne<Student>('/students', id)
      });

    this.loadStages();
  }

  protected goBack(): void {
    this.router.navigate(['/']); // Retorna ao quadro Kanban
  }

  protected setTab(tab: { id: number; label: string }): void {
    this.activeTab.set(tab);
  }

  /**
   * Rola a timeline de etapas horizontalmente (botões < > da referência).
   * Usamos scrollBy nativo em vez de recalcular posições manualmente —
   * mais simples e o navegador já cuida da animação suave.
   */
  protected scrollTimeline(direction: 1 | -1): void {
    const track = this.timelineTrack()?.nativeElement;

    if (!track) {
      return;
    }

    track.scrollBy({ left: direction * 220, behavior: 'smooth' });
  }

  protected openMessageModal(): void {
    this.messageControl.reset('');
    this.isMessageModalOpen.set(true);
  }

  protected closeMessageModal(): void {
    this.isMessageModalOpen.set(false);
  }

  /**
   * Confirma e salva a mensagem. O modal fecha imediatamente após o set,
   * o que também serve como proteção simples contra duplo-clique criando
   * duas mensagens iguais (a UI não permite um segundo clique no modal
   * que já não está mais visível).
   */
  protected confirmMessage(): void {
    const text = this.messageControl.value.trim();

    if (!text) {
      return;
    }

    const newMessage: ProposalMessage = {
      id: Date.now(),
      text,
      createdAt: new Date().toISOString()
    };

    // Mais recente primeiro
    this.messages.set([newMessage, ...this.messages()]);
    this.closeMessageModal();
  }

  /**
   * Busca as etapas para montar a timeline. Reaproveita o MESMO resource
   * do Kanban ('/kanban/stages') via FetchData genérico — é o mesmo dado,
   * só exibido de outra forma aqui. Se falhar, a timeline fica vazia mas
   * o resto da tela (mensagens, tabela de atividades) continua funcional.
   */
  private loadStages(): void {
    this.fetchData.getAll<Stage>(this.stagesResource).subscribe({
      next: (stages) => this.stages.set([...stages].sort((a, b) => a.order - b.order)),
      error: (error) => console.error('[StudentDetails] Não foi possível carregar as etapas.', error)
    });
  }

  protected isStageDone(stage: Stage): boolean {
    return stage.order < this.currentStageOrder();
  }

  protected isStageActive(stage: Stage): boolean {
    return stage.id === this.currentStageId();
  }
}