import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiEnvelope, QueryParam } from '../interface/interfaces';
import { environment } from '../../environments/environment';

/**
 * Client HTTP genérico: UM ÚNICO service para qualquer recurso da API,
 * em vez de um método por domínio (getStages, getStudents, etc.). O
 * endpoint ("resource") é passado por parâmetro em cada chamada.
 *
 * Espelha o padrão da sua aplicação final (getAll/getOne/saveData/
 * putById/deleteData), sem LoadingService/DialogMessagesService/
 * AuthService por enquanto — essas dependências fazem sentido na
 * aplicação real, mas adicionariam complexidade desnecessária nesta fase
 * de protótipo.
 */
@Injectable({ providedIn: 'root' })
export class FetchData {
  private readonly http = inject(HttpClient);

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
   * Ex: getAll<Stage>('/kanban/stages')
   * Ex. com busca: getAll<Student>('/kanban/students', [{ search: 'ana' }])
   */
  getAll<T>(resource: string, query?: QueryParam[]): Observable<T[]> {
    const url = `${this.baseUrl}${resource}${this.buildQuery(query)}`;

    return this.http
      .get<ApiEnvelope<T[]>>(url)
      .pipe(map((response) => response.data), catchError(this.handleError(resource)));
  }

  /**
   * Busca um único registro.
   * Ex: getOne<Student>('/kanban/students', 101)
   */
  getOne<T>(resource: string, id: number | string, subResource?: string, query?: QueryParam[]): Observable<T> {
    const path = `${resource}/${id}${subResource ? '/' + subResource : ''}`;
    const url = `${this.baseUrl}${path}${this.buildQuery(query)}`;

    return this.http
      .get<ApiEnvelope<T>>(url)
      .pipe(map((response) => response.data), catchError(this.handleError(resource)));
  }

  /**
   * Cria um novo registro.
   * Ex: saveData<Student>('/kanban/students', novoAluno)
   */
  saveData<T>(resource: string, body: unknown): Observable<T> {
    const url = `${this.baseUrl}${resource}`;

    return this.http
      .post<ApiEnvelope<T>>(url, body)
      .pipe(map((response) => response.data), catchError(this.handleError(resource)));
  }

  /**
   * Atualiza um registro existente (total ou parcial).
   * Ex: putById<void>('/kanban/students', 101, { newStageId: 3 }, 'stage')
   *  -> PUT /kanban/students/101/stage
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
      .put<ApiEnvelope<T>>(url, body)
      .pipe(map((response) => response.data), catchError(this.handleError(resource)));
  }

  /**
   * Remove um registro (ou coleção filtrada por query).
   */
  deleteData<T>(resource: string, query?: QueryParam[]): Observable<T> {
    const url = `${this.baseUrl}${resource}${this.buildQuery(query)}`;

    return this.http
      .delete<ApiEnvelope<T>>(url)
      .pipe(map((response) => response.data), catchError(this.handleError(resource)));
  }

  /**
   * Tratamento de erro centralizado — sem dialog/auth por enquanto.
   * Loga o erro original (útil em dev) e propaga uma mensagem amigável;
   * o componente decide como exibi-la (ex: this.errorMessage.set(...)).
   */
  private handleError(resource: string) {
    return (error: unknown): Observable<never> => {
      console.error(`[FetchData] Falha em "${resource}"`, error);
      return throwError(() => new Error(`Não foi possível completar a operação em "${resource}".`));
    };
  }
}