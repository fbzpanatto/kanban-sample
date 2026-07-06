import { ChangeDetectionStrategy, Component, input } from '@angular/core'; // <-- Importe o 'input'
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-kanban-filters',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './filters.html',
  styleUrl: './filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Filters {
  readonly searchControl = input.required<FormControl<string>>();
}