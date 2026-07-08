import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FetchData } from '../../services/fetch-data';
import { ProposalMessage, Stage, Student } from '../../interface/interfaces';

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
  private readonly studentsResource = '/students';

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

  // --- Aluno real (buscado pela rota) ---

  protected readonly student = signal<Student | null>(null);

  // --- Timeline de etapas ---

  protected readonly stages = signal<Stage[]>([]);

  /**
   * Etapa atual do aluno — agora derivada do aluno real carregado via
   * FetchData.getOne, em vez do valor fixo que tínhamos antes. Enquanto
   * o aluno ainda não carregou, cai em 0 (nenhuma etapa da timeline bate
   * com 0, então nada fica marcado como ativo — estado neutro, não um
   * "estágio 3" enganoso).
   */
  protected readonly currentStageId = computed(() => this.student()?.stageId ?? 0);

  protected readonly currentStageName = computed(() => {
    const stage = this.stages().find((s) => s.id === this.currentStageId());
    return stage?.name ?? '';
  });

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

        if (id) {
          void this.loadStudent(id);
        }
      });

    void this.loadStages();
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
   * Busca o aluno real pela rota. Se falhar (ex: 404 "Aluno não
   * encontrado" — que já é um businessError vindo do backend), o
   * FetchData já abre o modal global sozinho (ver ErrorDialogService);
   * aqui só logamos pra debug e deixamos o resto da tela com os
   * placeholders (nome vazio, timeline sem etapa ativa) em vez de travar.
   */
  private async loadStudent(id: string): Promise<void> {
    try {
      const student = await firstValueFrom(this.fetchData.getOne<Student>(this.studentsResource, id));
      this.student.set(student);
    } catch (error) {
      console.error('[StudentDetails] Não foi possível carregar o aluno.', error);
    }
  }

  /**
   * Busca as etapas para montar a timeline. Reaproveita o MESMO resource
   * do Kanban ('/stages') via FetchData genérico — é o mesmo dado, só
   * exibido de outra forma aqui. Se falhar, a timeline fica vazia mas
   * o resto da tela (mensagens, tabela de atividades) continua funcional
   * — por isso não propagamos o erro, só logamos e retornamos.
   */
  private async loadStages(): Promise<void> {
    try {
      const stages = await firstValueFrom(this.fetchData.getAll<Stage>(this.stagesResource));
      this.stages.set([...stages].sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('[StudentDetails] Não foi possível carregar as etapas.', error);
    }
  }

  protected isStageDone(stage: Stage): boolean {
    return stage.order < this.currentStageOrder();
  }

  protected isStageActive(stage: Stage): boolean {
    return stage.id === this.currentStageId();
  }
}