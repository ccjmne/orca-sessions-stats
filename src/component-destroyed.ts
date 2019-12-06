import { Observable, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Adapted from Angular2+ to AngularJS
// credit: https://github.com/w11k/ngx-componentdestroyed/blob/master/src/index.ts
export function componentDestroyed(component: { $onDestroy(): void }): Observable<true> {
  const modifiedComponent = component as { __componentDestroyed$?: Observable<true>, $onDestroy(): void };
  if (modifiedComponent.__componentDestroyed$) {
    return modifiedComponent.__componentDestroyed$;
  }

  const oldOnDestroy = component.$onDestroy;
  const stop$ = new ReplaySubject<true>();
  modifiedComponent.$onDestroy = () => {
    if (oldOnDestroy) {
      oldOnDestroy.apply(component);
    }

    stop$.next(true);
    stop$.complete();
  };

  return modifiedComponent.__componentDestroyed$ = stop$.asObservable();
}

export function untilComponentDestroyed<T>(component: { $onDestroy(): void }): (source: Observable<T>) => Observable<T> {
  return (source: Observable<T>) => source.pipe(takeUntil(componentDestroyed(component)));
}
