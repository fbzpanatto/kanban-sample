/**
 * As 3 formas possíveis de resposta da API — toda resposta sempre tem
 * `status`, e se diferenciam pela chave adicional presente:
 *
 * - `data`          → sucesso
 * - `businessError` → regra de negócio prevista (ex: "aluno não encontrado",
 *                      futuramente "email já em uso") — o backend detectou
 *                      isso DENTRO do try, de propósito.
 * - `systemError`   → algo fugiu do controle (banco fora do ar, exceção não
 *                      tratada) — sempre vem do catch genérico do controller.
 *
 * O FetchData usa essas 3 formas para decidir automaticamente o que fazer
 * com cada erro (ver handleError), sem que cada componente precise saber
 * a diferença.
 */
export interface ApiSuccess<T> {
  status: number;
  data: T;
}

export interface ApiBusinessError {
  status: number;
  businessError: string;
}

export interface ApiSystemError {
  status: number;
  systemError: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiBusinessError | ApiSystemError;

/** Type guard: response é o formato de erro de negócio? */
export function isBusinessError(response: unknown): response is ApiBusinessError {
  return typeof response === 'object' && response !== null && 'businessError' in response;
}

/** Type guard: response é o formato de erro de sistema? */
export function isSystemError(response: unknown): response is ApiSystemError {
  return typeof response === 'object' && response !== null && 'systemError' in response;
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