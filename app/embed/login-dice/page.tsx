'use client';

import dynamic from 'next/dynamic';

const LoginDiceViewer = dynamic(() => import('@/components/dice/LoginDiceViewer'), {
  ssr: false,
  loading: () => (
    <div className="login-dice-placeholder" />
  ),
});

/**
 * Embed: 3D dice only. Single default container so the canvas gets real dimensions.
 * Models from /Models/dice (public).
 */
export default function LoginDiceEmbedPage() {
  return (
    <>
      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #fff;
        }
        /* Prevent failed favicon from showing as broken image in WebView */
        link[rel="icon"],
        link[rel="shortcut icon"],
        link[rel="apple-touch-icon"] {
          display: none !important;
        }
        #__next {
          width: 100%;
          height: 100%;
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
        }
        .login-dice-root {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          min-height: 160px;
        }
        .login-dice-placeholder {
          width: 100%;
          height: 100%;
          min-height: 160px;
          background: #f3f4f6;
        }
      `}</style>
      <div className="login-dice-root">
        <LoginDiceViewer />
      </div>
    </>
  );
}
