import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Stage, Student, UpdateStagePayload } from '../interface/interfaces';
import { environment } from '../../environments/environment';

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
   * Busca alunos filtrando por nome. O componente chama este método
   * já com debounce + distinctUntilChanged aplicados (ver KanbanBoardComponent),
   * então cada chamada aqui já representa um termo "estável" digitado
   * pelo usuário — não precisamos nos preocupar com throttling aqui.
   *
   * Endpoint sugerido: GET /kanban/students?search=termo
   * No backend, este filtro deve virar um WHERE name LIKE ? parametrizado
   * (nunca concatenar o termo diretamente na query, por segurança contra
   * SQL Injection).
   */
  searchStudents(term: string): Observable<Student[]> {
    const params = new HttpParams().set('search', term.trim());

    return this.http
      .get<Student[]>(`${this.baseUrl}/students`, { params })
      .pipe(catchError(this.handleError('Erro ao buscar alunos')));
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