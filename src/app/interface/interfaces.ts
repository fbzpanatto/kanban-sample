/**
 * Representa uma etapa (coluna) do quadro de progresso.
 * Nesta fase do protótipo, as etapas podem vir fixas do frontend
 * ou de uma tabela simples no MySQL (ex: tabela `etapa_progresso`).
 */
export interface Stage {
  id: number;
  name: string;
  /** Ordem de exibição da coluna no quadro (1, 2, 3...) */
  order: number;
}

/**
 * Representa um aluno (cartão) dentro de uma coluna do Kanban.
 */
export interface Student {
  id: number;
  name: string;
  avatarUrl?: string;
  /** Turma do aluno, exibida como metadado no cartão */
  className?: string;
  /** Etapa atual do aluno — usado para agrupar nas colunas */
  stageId: number;
  /** Data em que o aluno entrou na etapa atual (ISO string) */
  enteredStageAt: string;
}

/**
 * Payload enviado à API quando um aluno é movido de coluna via drag-and-drop.
 */
export interface UpdateStagePayload {
  studentId: number;
  newStageId: number;
}