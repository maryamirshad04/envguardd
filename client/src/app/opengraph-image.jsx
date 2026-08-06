import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'envguard — stop pasting .env files into Slack';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#0d0f0e',
          color: '#f4f4f2',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, color: '#b6ff3c' }}>
          🔒 envguard
        </div>
        <div style={{ marginTop: 40, fontSize: 60, fontWeight: 600, lineHeight: 1.1, maxWidth: 900 }}>
          Stop pasting <span style={{ color: '#b6ff3c' }}>.env</span> files into Slack.
        </div>
        <div style={{ marginTop: 24, fontSize: 26, color: '#9a9a94', maxWidth: 800 }}>
          Encrypted, role-based secrets management for teams — with a CLI.
        </div>
      </div>
    ),
    { ...size }
  );
}