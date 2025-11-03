import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockComponent } from './mock.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MockComponent, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  title = 'test-orm';
}
