import { ActivatedRoute, RouterState } from '@angular/router';

const process = (activatedRoute: ActivatedRoute, matchingFunc: (route: ActivatedRoute) => boolean) => {
  if (matchingFunc(activatedRoute)) {
    return activatedRoute;
  }
  const { children } = activatedRoute;
  for (let i = 0; i < children.length; i++) {
    const result = process(children[i], matchingFunc);
    if (result) {
      return result;
    }
  }
}

export const findRoute = (routerState: RouterState, matchingFunc) => {
  return process(routerState.root, matchingFunc);
}
