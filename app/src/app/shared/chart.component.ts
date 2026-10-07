import { AfterViewInit, Component, ElementRef, effect, inject, input } from '@angular/core';
import { HBC } from '../core/analytics/legacy';

/**
 * One SVG chart from the prototype's chart library (src/legacy/hb-charts.js).
 * `draw` takes the container width and returns SVG markup; the library redraws
 * on resize and handles the hover tooltips.
 */
@Component({
  selector: 'hb-chart',
  standalone: true,
  template: '',
  host: { class: 'an-chart d-block' }
})
export class ChartComponent implements AfterViewInit {
  readonly draw = input<((w: number) => string) | null>(null);
  private el = inject(ElementRef<HTMLElement>);
  private ready = false;

  constructor() {
    effect(() => {
      const d = this.draw();
      if (this.ready && d) HBC().mount(this.el.nativeElement, d);
    });
  }

  ngAfterViewInit(): void {
    this.ready = true;
    const d = this.draw();
    if (d) setTimeout(() => HBC().mount(this.el.nativeElement, d), 0);
  }
}
