import { useCallback } from 'react';
import { useNavigate, useSearchParams, type NavigateOptions, type To } from 'react-router-dom';

/**
 * Wraps react-router's useNavigate so that internal rep-portal navigations
 * preserve the ?admin_view_rep=<id> query param when an admin is impersonating.
 *
 * Only string paths that start with "/rep" get the param appended. Anything
 * else (external routes, numeric back navigation, To objects) passes through
 * untouched so the impersonation id never leaks off the rep portal.
 */
export const useRepNavigate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const impersonateRepId = searchParams.get('admin_view_rep');

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        return navigate(to);
      }

      if (!impersonateRepId || typeof to !== 'string' || !to.startsWith('/rep')) {
        return navigate(to as To, options);
      }

      const [pathPart, queryPart = ''] = to.split('?');
      const params = new URLSearchParams(queryPart);
      if (!params.has('admin_view_rep')) {
        params.set('admin_view_rep', impersonateRepId);
      }
      const qs = params.toString();
      return navigate(qs ? `${pathPart}?${qs}` : pathPart, options);
    },
    [navigate, impersonateRepId],
  );
};

export default useRepNavigate;
