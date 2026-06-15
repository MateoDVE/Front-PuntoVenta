import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');
  
  // Set no-cache headers for all API requests to prevent browser caching issues
  let headers = req.headers
    .set('Cache-Control', 'no-cache, no-store, must-revalidate')
    .set('Pragma', 'no-cache')
    .set('Expires', '0');

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  let clonedReq = req.clone({ headers });

  // Add cache buster query parameter to GET requests (except assets) to force fetching fresh data
  if (req.method === 'GET' && !req.url.includes('/assets/')) {
    const separator = req.url.includes('?') ? '&' : '?';
    clonedReq = clonedReq.clone({
      url: `${req.url}${separator}cb=${Date.now()}`
    });
  }
  
  return next(clonedReq);
};
