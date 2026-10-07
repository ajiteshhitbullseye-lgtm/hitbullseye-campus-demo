import { Observable, defer, of, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../api-types';
import { clone } from '../../util';

/**
 * Runs a mock "request": waits the configured latency, then executes the
 * handler (so nothing happens until someone subscribes, like HTTP) and
 * returns a deep copy, so callers can never mutate the mock database.
 */
export function mockRequest<T>(handler: () => T): Observable<T> {
  return timer(environment.mockLatencyMs).pipe(
    switchMap(() => defer(() => {
      try {
        const v = handler();
        return of(v === undefined ? (v as T) : clone(v));
      } catch (e) {
        return throwError(() => e);
      }
    }))
  );
}

export function fail(status: number, code: string, message: string, data?: unknown): never {
  throw new ApiError(status, code, message, data);
}
