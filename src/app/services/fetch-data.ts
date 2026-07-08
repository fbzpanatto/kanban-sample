import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiSuccess, QueryParam, isBusinessError, isSystemError } from '../interface/interfaces';
import { environment } from '../../environments/environment';
import { ErrorDialogService } from './error-dialog';

/**
 * Client HTTP genérico: UM ÚNICO service para qualquer recurso da API,
 * em vez de um método por domínio (getStages, getStudents, etc.). O
 * endpoint ("resource") é passado por parâmetro em cada chamada.
 *
 * Espelha o padrão da sua aplicação final (getAll/getOne/saveData/
 * putById/deleteData), sem LoadingService/AuthService por enquanto —
 * essas dependências fazem sentido na aplicação real, mas adicionariam
 * complexidade desnecessária nesta fase de protótipo. O ErrorDialogService
 * já entrou, porque resolve um problema real de UX (ver handleError).
 */
@Injectable({ providedIn: 'root' })
export class FetchData {
  private readonly http = inject(HttpClient);
  private readonly errorDialogService = inject(ErrorDialogService);

  // Fix: sem barra final — cada chamada já adiciona a própria barra
  // (ex: `/stages`), evitando `apiUrl//stages`.
  private readonly baseUrl = environment.apiUrl;

  /**
   * Monta a querystring a partir de um array de pares chave/valor.
   * encodeURIComponent por segurança: evita que um valor com caracteres
   * especiais quebre a URL ou vire um parâmetro não intencional.
   */
  private buildQuery(query?: QueryParam[]): string {
    if (!query || query.length === 0) {
      return '';
    }

    const pairs = query
      .map((param) =>
        Object.entries(param).map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      )
      .flat();

    return pairs.length ? `?${pairs.join('&')}` : '';
  }

  /**
   * Busca uma coleção.
   * Ex: getAll<Stage>('/stages')
   * Ex. com busca: getAll<Student>('/students', [{ search: 'ana' }])
   */
  getAll<T>(resource: string, query?: QueryParam[]): Observable<T[]> {
    const url = `${this.baseUrl}${resource}${this.buildQuery(query)}`;

    return this.http
      .get<ApiSuccess<T[]>>(url)
      .pipe(map((response) => response.data), catchError(this.handleError(resource)));
  }

  /**
   * Busca um único registro.
   * Ex: getOne<Student>('/students', 101)
   */
  getOne<T>(resource: string, id: number | string, subResource?: string, query?: QueryParam[]): Observable<T> {
    const path = `${resource}/${id}${subResource ? '/' + subResource : ''}`;
    const url = `${this.baseUrl}${path}${this.buildQuery(query)}`;

    return this.http
      .get<ApiSuccess<T>>(url)
      .pipe(map((response) => response.data), catchError(this.handleError(resource)));
  }

  /**
   * Cria um novo registro.
   * Ex: saveData<Student>('/students', novoAluno)
   */
  saveData<T>(resource: string, body: unknown): Observable<T> {
    const url = `${this.baseUrl}${resource}`;

    return this.http
      .post<ApiSuccess<T>>(url, body)
      .pipe(map((response) => response.data), catchError(this.handleError(resource)));
  }

  /**
   * Atualiza um registro existente (total ou parcial).
   * Ex: putById<void>('/students', 101, { newStageId: 3 }, 'stage')
   *  -> PUT /students/101/stage
   */
  putById<T>(
    resource: string,
    id: number | string,
    body: unknown,
    subResource?: string,
    query?: QueryParam[]
  ): Observable<T> {
    const path = `${resource}/${id}${subResource ? '/' + subResource : ''}`;
    const url = `${this.baseUrl}${path}${this.buildQuery(query)}`;

    return this.http
      .put<ApiSuccess<T>>(url, body)
      .pipe(map((response) => response.data), catchError(this.handleError(resource)));
  }

  /**
   * Remove um registro (ou coleção filtrada por query).
   */
  deleteData<T>(resource: string, query?: QueryParam[]): Observable<T> {
    const url = `${this.baseUrl}${resource}${this.buildQuery(query)}`;

    return this.http
      .delete<ApiSuccess<T>>(url)
      .pipe(map((response) => response.data), catchError(this.handleError(resource)));
  }

  /**
   * Tratamento de erro centralizado. Reconhece as 3 formas de resposta
   * (ver interfaces.ts) e reage diferente pra cada uma:
   *
   * - businessError → abre o modal global (ErrorDialogService), porque é
   *   uma mensagem que faz sentido pro usuário final ler ("Aluno não
   *   encontrado", futuramente "Email já em uso").
   * - systemError → NÃO abre modal (o usuário não precisa/deveria ver
   *   "erro de conexão com o banco de dados" cru) — só loga no console
   *   pra debug, e propaga uma mensagem genérica.
   * - Qualquer outro caso (erro de rede, resposta que não é nem uma coisa
   *   nem outra) → mesmo fallback genérico de antes.
   *
   * Em TODOS os casos, o erro continua sendo propagado pro
   * `.subscribe({ error: ... })` de quem chamou — isso é o que permite
   * o KanbanBoardComponent continuar revertendo o cartão visualmente em
   * caso de falha, por exemplo. O modal é ADICIONAL, não substitui esse
   * fluxo.
   */
  private handleError(resource: string) {
    return (error: unknown): Observable<never> => {
      if (error instanceof HttpErrorResponse) {
        const body = error.error;

        if (isBusinessError(body)) {
          this.errorDialogService.show(body.businessError);
          return throwError(() => new Error(body.businessError));
        }

        if (isSystemError(body)) {
          console.error(`[FetchData] Erro de sistema em "${resource}"`, body.systemError);
          return throwError(() => new Error('Não foi possível completar a operação. Tente novamente.'));
        }
      }

      console.error(`[FetchData] Falha em "${resource}"`, error);
      return throwError(() => new Error(`Não foi possível completar a operação em "${resource}".`));
    };
  }
}