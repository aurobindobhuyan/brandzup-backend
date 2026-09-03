export const PUBLIC_ROUTES: { method: string; path: RegExp }[] = [
  { method: "POST", path: /^\/user\/register\/?$/ },
];

export const isPublic = (method: string, path: string) =>
  PUBLIC_ROUTES.some(
    (route) => route.method === method && route.path.test(path),
  );
