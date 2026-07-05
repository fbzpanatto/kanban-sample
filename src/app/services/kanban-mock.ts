import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Stage, Student, UpdateStagePayload } from "../interface/interfaces";

/**
 * Versão "mockada" do KanbanService, usada enquanto o backend Node/Express
 * e o banco MySQL ainda não estão disponíveis para o protótipo.
 *
 * Mantém EXATAMENTE a mesma assinatura pública do KanbanService (mesmos
 * nomes de método, mesmos tipos de retorno via Observable). Isso é
 * intencional: o KanbanBoardComponent continua chamando `.subscribe()`
 * normalmente, sem saber (e sem precisar saber) se os dados vêm de uma
 * API real ou de um array em memória.
 *
 * Quando o backend estiver pronto, a troca é feita em um único lugar
 * (ver instrução de app.config.ts abaixo) — nenhum componente precisa
 * ser tocado.
 */
@Injectable({ providedIn: 'root' })
export class KanbanMock {
  /**
   * Simula latência de rede. Importante manter isso mesmo no mock:
   * se os dados retornarem instantaneamente, você nunca testa o estado
   * de "loading" da tela nem eventuais race conditions do drag-and-drop
   * (ex: usuário arrastando um segundo cartão antes da resposta do primeiro).
   */
  private readonly SIMULATED_LATENCY_MS = 400;

  private readonly mockStages: Stage[] = [
    { id: 1, name: 'Inscrito', order: 1 },
    { id: 2, name: 'Em Treinamento', order: 2 },
    { id: 3, name: 'Peça em Produção', order: 3 },
    { id: 4, name: 'Em Validação', order: 4 },
    { id: 5, name: 'Concluído', order: 5 }
  ];

  /**
   * Não é readonly: o método updateStudentStage precisa mutar esta lista
   * para que o mock se comporte como um backend real dentro da mesma
   * sessão (se você recarregar o board, o aluno "continua" na etapa
   * pra onde foi movido).
   */
  private mockStudents: Student[] = [
    {
      id: 101,
      name: 'Ana Beatriz Souza',
      className: 'Turma A - Manhã',
      stageId: 1,
      enteredStageAt: '2026-06-20T09:00:00.000Z'
    },
    {
      id: 102,
      name: 'Carlos Eduardo Lima',
      className: 'Turma B - Noite',
      stageId: 1,
      enteredStageAt: '2026-06-21T09:00:00.000Z'
    },
    {
      id: 103,
      name: 'Fernanda Alves',
      className: 'Turma A - Manhã',
      stageId: 2,
      enteredStageAt: '2026-06-15T09:00:00.000Z'
    },
    {
      id: 104,
      name: 'Juliana Ferreira',
      className: 'Turma C - Tarde',
      stageId: 2,
      enteredStageAt: '2026-06-18T09:00:00.000Z'
    },
    {
      id: 105,
      name: 'Marcos Paulo Ribeiro',
      className: 'Turma B - Noite',
      stageId: 3,
      enteredStageAt: '2026-06-10T09:00:00.000Z'
    },
    {
      id: 106,
      name: 'Patrícia Gomes',
      className: 'Turma A - Manhã',
      stageId: 4,
      enteredStageAt: '2026-06-05T09:00:00.000Z'
    },
    {
      id: 107,
      name: 'Rafael Nascimento',
      className: 'Turma C - Tarde',
      stageId: 5,
      enteredStageAt: '2026-05-30T09:00:00.000Z'
    }
  ];

  getStages(): Observable<Stage[]> {
    // Retorna uma cópia (spread) para evitar que quem consome o array
    // mute acidentalmente o mock interno por referência.
    return of([...this.mockStages]).pipe(delay(this.SIMULATED_LATENCY_MS));
  }

  getStudents(): Observable<Student[]> {
    return of([...this.mockStudents]).pipe(delay(this.SIMULATED_LATENCY_MS));
  }

  updateStudentStage(payload: UpdateStagePayload): Observable<void> {
    this.mockStudents = this.mockStudents.map((student) =>
      student.id === payload.studentId
        ? { ...student, stageId: payload.newStageId }
        : student
    );

    return of(undefined).pipe(delay(this.SIMULATED_LATENCY_MS));
  }
}