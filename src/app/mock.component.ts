import { Component, ChangeDetectorRef, ViewChild, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-mock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isDev" class="mock-shell">
      <button (click)="toggleMockWorkbench()" class="btn-secondary">Toggle Mock Workbench</button>
      <div class="mock-area">
        <ng-template #mockHost></ng-template>
      </div>
    </div>
  `,
  styles: [
    `
    .mock-shell {
      position: relative; /* establish containing block for absolute button */
    }

    .btn-secondary {
      position: fixed; /* stay fixed relative to viewport */
      top: 12px;
      left: 12px;
      z-index: 9999;
      padding: 0.5rem 0.75rem;
      border: none;
      border-radius: 6px;
      background: #2b6cb0; /* pleasant blue */
      color: white;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    }

    .btn-secondary:active {
      transform: translateY(1px);
    }
    `
  ]
})
export class MockComponent {
  readonly isDev = !!environment?.mockEnabled;

  @ViewChild('mockHost', { read: ViewContainerRef, static: false }) mockHost!: ViewContainerRef;

  private mountController: { destroy?: () => void; ref?: any } | null = null;

  constructor(private cd: ChangeDetectorRef) { }

  async toggleMockWorkbench(): Promise<void> {
    if (!this.isDev) return;

    // If already mounted, destroy
    if (this.mountController) {
      try {
        this.mountController.destroy?.();
      } catch (_e) {
        /* noop */
      }
      this.mountController = null;
      this.cd.detectChanges();
      return;
    }

    try {
      if (!this.mockHost) {
        // host hasn't been initialized yet
        // eslint-disable-next-line no-console
        console.warn('Mock host not ready yet.');
        return;
      }
      const pkgAny: any = await import('lib-mock-workbench').catch(() => null);
      if (pkgAny && typeof pkgAny.mountMockWorkbench === 'function') {
        const controller = pkgAny.mountMockWorkbench(this.mockHost, DEFAULT_DB_INIT_OPTIONS);
        if (controller && controller.ref) this.mountController = controller;
        else this.mountController = { ref: controller } as any;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Could not mount lib-mock-workbench:', e);
    }

    this.cd.detectChanges();
  }
}

export const DEFAULT_DB_INIT_OPTIONS = {
  dbName: 'app-mock-db',
  version: 2,
  httpOnly: false,
  stores: [
    {
      name: 'http-mocks', keyPath: '_id', autoIncrement: true, indexes: [
        { name: 'by_serviceCode', keyPath: 'serviceCode' },
        { name: 'by_url', keyPath: 'url' }
      ]
    }
  ],
  keyMock: (environment && (environment as any).mockKey) ? (environment as any).mockKey : 'test',
  contextOptions: [
    { id: 1, value: '---------', useMock: false },
    { id: 2, value: 'Usar HTTP Service', useMock: false },
    { id: 3, value: 'Usar HTTP Interceptor', useMock: false },
    { id: 4, value: 'Usar Data', useMock: true },
  ]
}
