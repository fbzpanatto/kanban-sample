import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { QueryParam, Stage, Student, UpdateStagePayload } from '../interface/interfaces';

/**
 * Centraliza os textos de resource usados pelo Kanban, evitando strings
 * mágicas espalhadas entre este mock e o componente.
 */
const STAGES_RESOURCE = '/kanban/stages';
const STUDENTS_RESOURCE = '/kanban/students';

/**
 * Versão "mockada" do FetchData, usada enquanto o backend Node/Express
 * e o banco MySQL ainda não estão disponíveis.
 *
 * Diferença importante em relação à versão anterior (método por domínio):
 * como o service real agora é genérico (um método serve qualquer
 * resource), o mock não pode mais despachar por nome de método — ele
 * precisa checar QUAL resource foi pedido e decidir o que devolver.
 * Mantenha as constantes acima sincronizadas com o que o componente
 * realmente envia.
 */
@Injectable({ providedIn: 'root' })
export class KanbanMock {
  /**
   * Simula latência de rede — "dados em tempo real" no sentido de
   * comportamento assíncrono real (loading, race conditions), não
   * apenas retornar tudo instantaneamente.
   */
  private readonly SIMULATED_LATENCY_MS = 400;

  private readonly mockStages: Stage[] = [
    { id: 1, name: '1ª Call', order: 1 },
    { id: 2, name: 'Negociação', order: 2 },
    { id: 3, name: 'Proposta', order: 3 },
    { id: 4, name: 'Aguardando Pagamento', order: 4 },
    { id: 5, name: 'Concluído', order: 5 }
  ];

  /**
   * Não é readonly: putById precisa mutar esta lista para que o mock se
   * comporte como um backend real dentro da mesma sessão (se você
   * recarregar o board, o aluno "continua" na etapa pra onde foi movido).
   */
  private mockStudents: Student[] = [
    { id: 101, name: 'Ana Beatriz Souza', className: 'Turma A - Manhã', stageId: 1, enteredStageAt: '2026-06-20T09:00:00.000Z' },
    { id: 102, name: 'Carlos Eduardo Lima', className: 'Turma B - Noite', stageId: 1, enteredStageAt: '2026-06-21T09:00:00.000Z' },
    { id: 103, name: 'Fernanda Alves', className: 'Turma A - Manhã', stageId: 2, enteredStageAt: '2026-06-15T09:00:00.000Z' },
    { id: 104, name: 'Juliana Ferreira', className: 'Turma C - Tarde', stageId: 2, enteredStageAt: '2026-06-18T09:00:00.000Z' },
    { id: 105, name: 'Marcos Paulo Ribeiro', className: 'Turma B - Noite', stageId: 3, enteredStageAt: '2026-06-10T09:00:00.000Z' },
    { id: 106, name: 'Patrícia Gomes', className: 'Turma A - Manhã', stageId: 4, enteredStageAt: '2026-06-05T09:00:00.000Z' },
    { id: 107, name: 'Rafael Nascimento', className: 'Turma C - Tarde', stageId: 5, enteredStageAt: '2026-05-30T09:00:00.000Z' }
  ];

  getAll<T>(resource: string, query?: QueryParam[]): Observable<T[]> {
    if (resource === STAGES_RESOURCE) {
      return of([...this.mockStages] as unknown as T[]).pipe(delay(this.SIMULATED_LATENCY_MS));
    }

    if (resource === STUDENTS_RESOURCE) {
      const searchTerm = this.extractQueryValue(query, 'search')?.toLowerCase();

      const results = searchTerm
        ? this.mockStudents.filter((student) => student.name.toLowerCase().includes(searchTerm))
        : this.mockStudents;

      return of([...results] as unknown as T[]).pipe(delay(this.SIMULATED_LATENCY_MS));
    }

    return this.unmocked(resource, 'getAll');
  }

  getOne<T>(resource: string): Observable<T> {
    return this.unmocked(resource, 'getOne');
  }

  saveData<T>(resource: string): Observable<T> {
    return this.unmocked(resource, 'saveData');
  }

  /**
   * Único método com comportamento real além de leitura: persiste a
   * mudança de etapa do aluno em memória, simulando o UPDATE que a API
   * faria no MySQL.
   */
  putById<T>(resource: string, id: number | string, body: unknown, subResource?: string): Observable<T> {
    if (resource === STUDENTS_RESOURCE && subResource === 'stage') {
      const payload = body as UpdateStagePayload;

      this.mockStudents = this.mockStudents.map((student) =>
        student.id === Number(id) ? { ...student, stageId: payload.newStageId } : student
      );

      return of(undefined as unknown as T).pipe(delay(this.SIMULATED_LATENCY_MS));
    }

    return this.unmocked(`${resource}/${id}/${subResource ?? ''}`, 'putById');
  }

  deleteData<T>(resource: string): Observable<T> {
    return this.unmocked(resource, 'deleteData');
  }

  private extractQueryValue(query: QueryParam[] | undefined, key: string): string | undefined {
    const match = query?.find((param) => key in param);
    return match ? String(match[key]) : undefined;
  }

  /**
   * Erro explícito quando um resource ainda não tem mock — melhor do que
   * devolver silenciosamente um array vazio, que esconderia o
   * esquecimento de configurar o mock até muito mais tarde.
   */
  private unmocked<T>(resource: string, method: string): Observable<T> {
    return throwError(
      () => new Error(`KanbanMock.${method}: nenhum mock configurado para "${resource}"`)
    );
  }
}