/**
 * In-app WebView of a website route.
 * Used so menu links open the same pages as the website (e.g. /all-games, /forums).
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { API_BASE_URL } from '../config/api';
import { useScrollNav } from '../contexts/ScrollContext';

const LOAD_TIMEOUT_MS = 35000; // 35s - game page fetches API which can be slow

type Props = {
  path: string;
  title?: string;
  showHeader?: boolean;
  hideWebHeader?: boolean;
  /** Bottom padding in px. true = 80 (default), false = 0, or pass a number. */
  padBottom?: boolean | number;
  embed?: boolean;
  interceptGameLinks?: boolean;
  disableScrollNav?: boolean;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
};

/** JS to detect scroll direction and post to RN for header/nav hide-on-scroll */
const SCROLL_DETECT_JS = `
(function() {
  var lastY = 0;
  var ticking = false;
  var threshold = 30;
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (y < 10) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll', visible: true }));
    } else if (y > lastY + threshold) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll', visible: false }));
      lastY = y;
    } else if (y < lastY - threshold) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll', visible: true }));
      lastY = y;
    }
    ticking = false;
  }
  function requestTick() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }
  window.addEventListener('scroll', requestTick, { passive: true });
  true;
})();
`;

function buildHideHeaderJs() {
  /* Inject CSS only - do not modify body/header/footer attributes to avoid React hydration mismatch */
  return `
  (function() {
    try {
      var s = document.createElement('style');
      s.id = 'kd-embed-hide-header';
      s.textContent = 'header{display:none!important}footer{display:none!important}' +
        'body{padding-top:0!important}main{padding-top:0!important}' +
        '.kd-back-to-home{display:none!important}';
      var old = document.getElementById('kd-embed-hide-header');
      if (old) old.remove();
      (document.head || document.documentElement).appendChild(s);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'boot' }));
      }
    } catch (e) {}
    true;
  })();
`;
}

function buildStatusBarPaddingJs(paddingTop: number) {
  return `
  (function() {
    var pt = ${paddingTop};
    function apply() {
      try {
        var s = document.createElement('style');
        s.id = 'kd-embed-safe-area';
        s.textContent = ':root{--kd-safe-area-inset-top:' + pt + 'px}' +
          'body{padding-top:0!important}' +
          'main{padding-top:0!important}';
        var old = document.getElementById('kd-embed-safe-area');
        if (old) old.remove();
        (document.head || document.documentElement).appendChild(s);
      } catch (e) {}
    }
    if (document.readyState === 'complete') {
      setTimeout(apply, 0);
    } else {
      window.addEventListener('load', function() { setTimeout(apply, 0); });
    }
    true;
  })();
`;
}

/** JS to open chat when openChat=1 - runs after load as fallback for embed/WebView */
const OPEN_CHAT_JS = `
  (function() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('openChat') === '1') {
        window.dispatchEvent(new CustomEvent('openChatFromEmbed'));
      }
    } catch (e) {}
    true;
  })();
`;

function buildBackgroundJs(color: string) {
  return `
  (function() {
    try {
      var s = document.createElement('style');
      s.id = 'kd-embed-bg';
      s.textContent = 'html,body{background:${color}!important;}';
      var old = document.getElementById('kd-embed-bg');
      if (old) old.remove();
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
    true;
  })();
`;
}

function buildGameLinkInterceptJs() {
  return `
  (function() {
    function postGameId(id) {
      if (window.ReactNativeWebView && id) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openGame', id: String(id) }));
      }
    }
    function extractGameId(pathname) {
      if (!pathname) return null;
      var parts = pathname.split('/');
      if (parts.length >= 3 && (parts[1] === 'game' || parts[1] === 'juego')) {
        return parts[2];
      }
      return null;
    }
    function handleUrl(url) {
      try {
        var u = new URL(url, window.location.origin);
        var id = extractGameId(u.pathname);
        if (id) postGameId(id);
      } catch (e) {}
    }
    document.addEventListener('click', function(e) {
      var el = e.target;
      while (el && el.tagName !== 'A') el = el.parentElement;
      if (!el || !el.href) return;
      handleUrl(el.href);
    }, true);

    // Hook history changes (Next.js client navigation)
    var _push = history.pushState;
    history.pushState = function(state, title, url) {
      _push.apply(history, arguments);
      if (url) handleUrl(url);
    };
    var _replace = history.replaceState;
    history.replaceState = function(state, title, url) {
      _replace.apply(history, arguments);
      if (url) handleUrl(url);
    };
    window.addEventListener('popstate', function() {
      handleUrl(window.location.href);
    });
    true;
  })();
`;
}

export default function WebViewScreen({
  path,
  title,
  showHeader = false,
  hideWebHeader = true,
  padBottom = true,
  embed = true,
  interceptGameLinks = true,
  disableScrollNav = true,
  onMessage,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setNavVisible } = useScrollNav();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewRef = useRef<WebView>(null);
  const base = API_BASE_URL.replace(/\/$/, '');
  const logoUri = `${base}/Logo.png`;
  const rawPath = path.startsWith('/') ? path : `/${path}`;
  const [pathPart, hash] = rawPath.includes('#') ? rawPath.split('#') : [rawPath, ''];
  const sep = pathPart.includes('?') ? '&' : '?';
  const withEmbed = embed ? `${pathPart}${sep}embed=1` : pathPart;
  const uri = `${base}${withEmbed}${hash ? `#${hash}` : ''}`;
  const headers = embed ? { 'x-kd-embed': '1' } : undefined;
  const needsOpenChat = path.includes('openChat=1');

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === 'boot') {
          return;
        }
        if (data?.type === 'openGame' && data?.id) {
          router.push(`/game/${data.id}` as any);
          return;
        }
        if (!disableScrollNav && data?.type === 'scroll' && typeof data.visible === 'boolean') {
          setNavVisible(data.visible);
        }
      } catch {}
      onMessage?.(event);
    },
    [setNavVisible, onMessage]
  );

  const injectedJs = [
    hideWebHeader ? buildHideHeaderJs() : '',
    buildStatusBarPaddingJs(insets.top),
    needsOpenChat ? OPEN_CHAT_JS : '',
    interceptGameLinks ? buildGameLinkInterceptJs() : '',
    !disableScrollNav ? SCROLL_DETECT_JS : '',
  ].filter(Boolean).join('\n') || undefined;

  const pageBg = '#ffffff';

  const injectedBeforeContentLoaded = hideWebHeader
    ? [buildHideHeaderJs(), buildBackgroundJs(pageBg)].join('\n')
    : buildBackgroundJs(pageBg);

  // Load timeout - game pages fetch from Supabase and can take a while
  useEffect(() => {
    setLoadError(null);
    setLoading(true);
    timeoutRef.current = setTimeout(() => {
      setLoadError('Page took too long to load. Check your connection and try again.');
      setLoading(false);
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [uri]);

  const handleLoadEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoadError(null);
    setLoading(false);
  }, []);

  const handleHttpError = useCallback((syntheticEvent: { nativeEvent: { description: string; statusCode: number } }) => {
    const { statusCode } = syntheticEvent.nativeEvent;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoading(false);
    setLoadError(statusCode === 404 ? 'Page not found.' : `Failed to load (${statusCode}). Try again.`);
  }, []);

  const retryLoad = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);


  const shouldInterceptGameLink = useCallback(
    (requestUrl: string) => {
      try {
        const url = new URL(requestUrl);
        const pathname = url.pathname || '';
        if (pathname.startsWith('/game/') || pathname.startsWith('/juego/')) {
          const parts = pathname.split('/');
          const gameId = parts[2];
          if (gameId) {
            router.push(`/game/${gameId}`);
            return true;
          }
        }
      } catch {}
      return false;
    },
    [router]
  );

  return (
    <View
      style={[
        styles.container,
        padBottom !== false && (padBottom === true ? styles.padBottom : { paddingBottom: typeof padBottom === 'number' ? padBottom : 80 }),
        { backgroundColor: pageBg },
      ]}
    >
      {showHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {title || path.replace(/^\//, '')}
          </Text>
          <View style={styles.backBtn} />
        </View>
      )}
      {(loading || loadError) && (
        <View style={[styles.loadingOverlay, { backgroundColor: pageBg }]}>
          {loadError ? (
            <>
              <Ionicons name="alert-circle-outline" size={48} color="#6b7280" style={{ marginBottom: 16 }} />
              <Text style={styles.loadingText}>{loadError}</Text>
              <TouchableOpacity onPress={retryLoad} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Image
                source={{ uri: logoUri }}
                style={styles.loadingLogo}
                resizeMode="contain"
              />
              <Text style={styles.loadingText}>Loading…</Text>
            </>
          )}
        </View>
      )}
      <WebView
        ref={webViewRef}
        key={reloadKey}
        source={{ uri, headers }}
        style={[styles.webview, { backgroundColor: pageBg }, (loading || loadError) && styles.webviewHidden]}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        scalesPageToFit
        startInLoadingState={false}
        mixedContentMode="always"
        injectedJavaScriptBeforeContentLoaded={injectedBeforeContentLoaded}
        injectedJavaScript={injectedJs}
        onLoadStart={() => { setLoading(true); setLoadError(null); }}
        onLoadEnd={handleLoadEnd}
        onHttpError={handleHttpError}
        onNavigationStateChange={(navState) => {
          if (!navState.loading) {
            setLoading(false);
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (!interceptGameLinks) return true;
          if (shouldInterceptGameLink(request.url)) return false;
          return true;
        }}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  padBottom: { paddingBottom: 80 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center' },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249, 250, 251, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingLogo: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 24,
    maxWidth: 320,
  },
  webviewHidden: { opacity: 0 },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#fbae17',
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
