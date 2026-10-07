import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input } from '@angular/core';
import { ICONS } from './icons';

/** <hb-icon name="check" /> — an inline SVG line icon that takes the text colour. */
@Component({
  selector: 'hb-icon',
  standalone: true,
  template: '',
  styles: [':host{display:inline-flex;line-height:0;flex:none} :host ::ng-deep svg{width:var(--ico,16px);height:var(--ico,16px)}'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input<number | null>(null);
  private el = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      const host = this.el.nativeElement as HTMLElement;
      host.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        (ICONS[this.name()] || '') + '</svg>';
      if (this.size()) host.style.setProperty('--ico', this.size() + 'px');
    });
  }
}
