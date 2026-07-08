import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ErrorDialog } from './components/error-dialog/error-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ErrorDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('nome-do-projeto');
}