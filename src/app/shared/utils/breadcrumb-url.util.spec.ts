import { isSelfLink, normalizeBreadcrumbUrl } from './breadcrumb-url.util';

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

describe('isSelfLink', () => {
  const accountTab = '/members/16/savings-accounts/5/general';

  it('matches the identical url', () => {
    expect(isSelfLink(accountTab, accountTab)).toBe(true);
  });

  it('matches the account crumb while one of its tabs is open', () => {
    expect(isSelfLink('/members/16/savings-accounts/5', accountTab)).toBe(true);
  });

  it('keeps the member crumb, which is a different page', () => {
    expect(isSelfLink('/members/16/general', accountTab)).toBe(false);
  });

  it('keeps the account crumb while a transaction is open', () => {
    expect(isSelfLink('/members/16/savings-accounts/5', '/members/16/savings-accounts/5/transactions/12/general')).toBe(
      false
    );
  });
});
