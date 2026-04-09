import type { ApiResponse } from '@simple-cms/types';

type SiteInfo = { name: string; status: string };

export default function HomePage() {
  const info: ApiResponse<SiteInfo> = {
    success: true,
    data: { name: 'Simple CMS', status: 'ok' },
  };

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <h1>Simple CMS</h1>
      <p>Stage 1 — 기초 환경 구축 완료</p>
      <pre
        style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#f5f5f5',
          borderRadius: '8px',
          fontSize: '0.875rem',
        }}
      >
        {JSON.stringify(info, null, 2)}
      </pre>
    </main>
  );
}
