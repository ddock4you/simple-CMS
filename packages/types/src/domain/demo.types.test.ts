import { describe, expect, it } from 'vitest';

import {
  demoAdminApiPath,
  demoBootstrapPath,
  stripDemoAdminBasePath,
} from './demo.types';

describe('demo route helpers', () => {
  it('prefixes admin API paths with the demo admin base path', () => {
    expect(demoAdminApiPath('/api/demo/reset')).toBe(
      '/_cms/admin/api/demo/reset',
    );
    expect(demoAdminApiPath('/_cms/admin/api/demo/reset')).toBe(
      '/_cms/admin/api/demo/reset',
    );
  });

  it('strips the demo admin base path without dropping query strings', () => {
    expect(stripDemoAdminBasePath('/_cms/admin/posts?page=2')).toBe(
      '/posts?page=2',
    );
    expect(stripDemoAdminBasePath('/_cms/admin')).toBe('/');
  });

  it('builds demo bootstrap paths with an encoded next parameter', () => {
    expect(demoBootstrapPath('/posts?page=2')).toBe(
      '/demo-bootstrap?next=%2Fposts%3Fpage%3D2',
    );
    expect(demoBootstrapPath()).toBe('/demo-bootstrap');
  });
});
