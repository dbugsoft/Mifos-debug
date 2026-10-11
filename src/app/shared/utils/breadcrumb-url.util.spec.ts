import { normalizeBreadcrumbUrl } from './breadcrumb-url.util';

describe('normalizeBreadcrumbUrl', () => {
  it('collapses duplicated slashes', () => {
    expect(normalizeBreadcrumbUrl('//members/')).toBe('/members/');
  });

  it('points a client crumb at its general tab', () => {
    expect(normalizeBreadcrumbUrl('//members//16', true)).toBe('/members/16/general');
  });

  it('leaves crumbs below the client routable', () => {
    expect(normalizeBreadcrumbUrl('//members//16/loans-accounts//2')).toBe('/members/16/loans-accounts/2');
    expect(normalizeBreadcrumbUrl('/members/16/savings-accounts/4/transactions/12')).toBe(
      '/members/16/savings-accounts/4/transactions/12'
    );
  });

  it('leaves other module urls alone', () => {
    expect(normalizeBreadcrumbUrl('/groups/2/general')).toBe('/groups/2/general');
  });
});
