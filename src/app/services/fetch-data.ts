import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';

import { Stage, Student, UpdateStagePayload } from '../interface/interfaces';


/**
 * Service responsável por toda a comunicação com o backend Node/Express
 * relacionada ao quadro Kanban. Mantemos a lógica de HTTP isolada do
 * componente para facilitar testes e reaproveitamento (ex: futura tela
 * de detalhes do aluno também poderá consumir este service).
 */
@Injectable({ providedIn: 'root' })
export class FetchData {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/kanban`;

  /**
   * Busca as etapas (colunas) cadastradas.
   * Endpoint sugerido: GET /kanban/stages
   */
  getStages(): Observable<Stage[]> {
    return this.http
      .get<Stage[]>(`${this.baseUrl}/stages`)
      .pipe(catchError(this.handleError('Erro ao carregar as etapas do quadro')));
  }

  /**
   * Busca todos os alunos já com a etapa atual de cada um.
   * O agrupamento por coluna é feito no frontend (ver KanbanBoardComponent).
   * Endpoint sugerido: GET /kanban/students
   */
  getStudents(): Observable<Student[]> {
    return this.http
      .get<Student[]>(`${this.baseUrl}/students`)
      .pipe(catchError(this.handleError('Erro ao carregar os alunos')));
  }

  /**
   * Persiste a mudança de etapa de um aluno (drag-and-drop entre colunas).
   * Endpoint sugerido: PATCH /kanban/students/:studentId/stage
   *
   * Importante: no backend, este UPDATE deve ser uma query parametrizada
   * via mysql2 (nunca concatenar o stageId diretamente na query).
   */
  updateStudentStage(payload: UpdateStagePayload): Observable<void> {
    return this.http
      .patch<void>(`${this.baseUrl}/students/${payload.studentId}/stage`, {
        newStageId: payload.newStageId
      })
      .pipe(catchError(this.handleError('Erro ao atualizar a etapa do aluno')));
  }

  /**
   * Centraliza o tratamento de erro das chamadas HTTP.
   * Loga o erro original no console (útil em dev) e propaga uma mensagem
   * amigável para a camada de apresentação decidir o que fazer.
   */
  private handleError(context: string) {
    return (error: unknown): Observable<never> => {
      console.error(`[KanbanService] ${context}`, error);
      return throwError(() => new Error(context));
    };
  }
}
