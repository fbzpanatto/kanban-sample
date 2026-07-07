/**
 * Envelope padrão de resposta da API. Toda resposta deve trazer os dados
 * dentro de `data` — isso permite que o FetchData trate qualquer resource
 * de forma genérica, sem conhecer a forma exata de cada payload.
 *
 * No backend Express, isso significa que TODO endpoint (não só os do
 * Kanban) deve responder no formato:
 *   { "data": [...] }  ou  { "data": {...} }
 * em vez de devolver o array/objeto cru direto.
 */
export interface ApiEnvelope<T> {
  data: T;
  error?: { message: string } | null;
}

/**
 * Par chave/valor usado para montar querystrings dinâmicas via FetchData
 * (?key=value&key2=value2...).
 */
export type QueryParam = Record<string, string | number | boolean>;

/**
 * Representa uma etapa (coluna) do quadro de progresso.
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
 * Corpo enviado ao mover um aluno entre colunas via drag-and-drop.
 * O ID do aluno NÃO vai mais aqui — ele é o parâmetro `id` de
 * FetchData.putById(resource, id, body, subResource).
 *
 * Ex: fetchData.putById<void>('/kanban/students', student.id, payload, 'stage')
 */
export interface UpdateStagePayload {
  newStageId: number;
}

/**
 * Mensagem de texto registrada no painel "Apresentação Proposta" (aba
 * Atividades do detalhe do aluno). Mantida aqui mesmo não estando em uso
 * na versão atual do student-detail — sem custo mantê-la disponível.
 */
export interface ProposalMessage {
  id: number;
  text: string;
  createdAt: string;
}