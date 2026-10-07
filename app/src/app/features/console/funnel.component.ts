import { Component, computed, input, output } from '@angular/core';
import { Funnel } from '../../core/services/people.service';
import { num, pctOf, pctText } from '../../core/util';
import { IconComponent } from '../../shared/icon.component';

export type FunnelKey = '' | 'estimated' | 'list' | 'signed' | 'registered' | 'attempted' | 'draft' | 'signed_only' | 'invited' | 'inactive';

interface Step { k: FunnelKey; cls: string; icon: string; label: string; n: number | null; note: string; pct: string; drop: number; width: number; }

/**
 * "Kitne bache estimated the, kitno ne sign in kiya": the campus funnel from
 * the college's own estimate down to who took a test. Every step is a filter.
 */
@Component({
  selector: 'hb-funnel',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (f(); as f) {
      @if (f.estimatedMissing.length) {
        <div class="est-missing mb-3"><hb-icon name="info" />
          <span><b>Estimate not filled</b> for {{ f.estimatedMissing.join(', ') }}. The placement cell fills it on the Profile tab, so we can compare signed-in students against what was expected.</span>
        </div>
      }
      <div class="funnel">
        @for (s of steps(); track s.k) {
          <button type="button" class="fstep" [class]="'fstep ' + s.cls" [class.on]="active() === s.k" (click)="pick.emit(s.k === 'estimated' ? 'list' : s.k)">
            <span class="ic"><hb-icon [name]="s.icon" /></span>
            <span class="n" [class.na]="s.n === null">{{ s.n === null ? 'Not filled' : fmt(s.n) }}</span>
            <span class="lb">{{ s.label }}</span>
            <span class="fbar"><i [style.width.%]="s.width"></i></span>
            <span class="pc">{{ s.pct }}</span>
            <span class="nt">{{ s.note }}</span>
            @if (s.drop > 0) { <span class="drop">{{ fmt(s.drop) }} dropped off here</span> }
          </button>
        }
      </div>
      <div class="d-flex mt gap-2 flex-wrap">
        <button type="button" class="fchip ok" [class.on]="active() === 'registered'" (click)="pick.emit('registered')"><b>{{ f.registered }}</b><span>finished the form</span></button>
        <button type="button" class="fchip draft" [class.on]="active() === 'draft'" (click)="pick.emit('draft')"><b>{{ f.draft }}</b><span>half-filled form saved as draft</span></button>
        <button type="button" class="fchip warn" [class.on]="active() === 'signed_only'" (click)="pick.emit('signed_only')"><b>{{ f.signedInOnly }}</b><span>signed in, form not started</span></button>
        <button type="button" class="fchip" [class.on]="active() === 'invited'" (click)="pick.emit('invited')"><b>{{ f.invited }}</b><span>never signed in</span></button>
        @if (f.inactive) { <button type="button" class="fchip mute" [class.on]="active() === 'inactive'" (click)="pick.emit('inactive')"><b>{{ f.inactive }}</b><span>inactive (not counted)</span></button> }
      </div>
    }
  `
})
export class FunnelComponent {
  readonly f = input<Funnel | null>(null);
  readonly active = input<FunnelKey>('');
  readonly pick = output<FunnelKey>();
  readonly fmt = num;

  readonly steps = computed<Step[]>(() => {
    const f = this.f();
    if (!f) return [];
    const base = Math.max(f.estimated || 0, f.onList, 1);
    const est = f.estimated;
    const raw: Omit<Step, 'pct' | 'drop' | 'width'>[] = [
      { k: 'estimated', cls: 'k-est', icon: 'target', label: 'Estimated by the college', n: est, note: 'filled on the Profile tab' },
      { k: 'list', cls: 'k-list', icon: 'list', label: 'On the master list', n: f.onList, note: 'synced from the admin panel' },
      { k: 'signed', cls: 'k-in', icon: 'userplus', label: 'Signed in', n: f.signedIn, note: 'OTP or college login' },
      { k: 'registered', cls: 'k-reg', icon: 'check', label: 'Registered', n: f.registered, note: 'form submitted' },
      { k: 'attempted', cls: 'k-att', icon: 'medal', label: 'Test attempted', n: f.attempted, note: 'at least one assessment' }
    ];
    return raw.map((s, i) => {
      const prev = i ? raw[i - 1].n : null;
      const n = s.n ?? 0;
      return {
        ...s,
        width: s.n === null ? 0 : Math.max(2, pctOf(n, base)),
        pct: s.n === null ? 'ask the college to fill it'
          : i === 0 ? '100% of the plan'
            : i === 1 ? (est ? pctText(n, est) + ' of the estimate' : 'the starting point')
              : pctText(n, prev || 0) + ' of the step before',
        drop: i > 1 && prev !== null && prev > n ? prev - n : 0
      };
    });
  });
}
