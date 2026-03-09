/**
 * In-app WebView of a website route.
 * Used so menu links open the same pages as the website (e.g. /all-games, /forums).
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Vibration, AppState } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { API_BASE_URL } from '../config/api';
import { useScrollNav } from '../contexts/ScrollContext';
import { useImageModal } from '../contexts/ImageModalContext';
import { useLocale } from '../contexts/LocaleContext';
import { apiClient } from '../lib/api-client';

const LOAD_TIMEOUT_MS = 35000; // 35s - game page fetches API which can be slow
const NATIVE_HEADER_HEIGHT = 56;
const PAUSE_TIMERS_JS = `(function(){try{window.dispatchEvent(new Event('kd_app_pause_timers'));}catch(e){}true;})();`;

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
  /** Diagnostic overlay: logs WebView load/navigation events on screen. */
  debugWebView?: boolean;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
};

/** JS to detect scroll direction and post to RN for header/nav hide-on-scroll.
 * Listens to window, document, and common scroll containers so it works
 * whether the page uses document scroll or a scroll container (main, #__next). */
const SCROLL_DETECT_JS = `
(function() {
  var lastY = 0;
  var hideAnchorY = 0;
  var showAnchorY = 0;
  var lastVisible = true;
  var lastEmitAt = 0;
  var ticking = false;
  var scrollTarget = null;
  var HIDE_DELTA = 56;
  var SHOW_DELTA = 10;
  var TOP_THRESHOLD = 12;
  var BOTTOM_THRESHOLD = 20;
  var COOLDOWN_MS = 120;

  function getScrollFromTarget(el) {
    if (!el) return null;
    if (el === document || el === window) {
      return { y: window.scrollY || document.documentElement.scrollTop, maxY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight) };
    }
    var y = el.scrollTop || 0;
    var maxY = Math.max(0, el.scrollHeight - el.clientHeight);
    return { y: y, maxY: maxY };
  }

  function getScrollState() {
    var el = scrollTarget || document.scrollingElement || document.documentElement;
    var s = getScrollFromTarget(el);
    if (s) return s;
    return { y: window.scrollY || document.documentElement.scrollTop || 0, maxY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight) };
  }

  function emitVisible(nextVisible, y) {
    if (nextVisible === lastVisible) return;
    var now = Date.now();
    if (now - lastEmitAt < COOLDOWN_MS) return;
    lastVisible = nextVisible;
    lastEmitAt = now;
    if (nextVisible) {
      showAnchorY = y;
    } else {
      hideAnchorY = y;
    }
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'scroll', visible: nextVisible })
    );
  }

  function onScroll() {
    var s = getScrollState();
    var y = s.y;
    var maxY = s.maxY;
    var movingDown = y > lastY;
    var movingUp = y < lastY;
    var atBottom = maxY > 0 && y >= maxY - BOTTOM_THRESHOLD;

    if (y <= TOP_THRESHOLD) {
      emitVisible(true, y);
    } else if (movingDown) {
      showAnchorY = y;
      if (y - hideAnchorY >= HIDE_DELTA) {
        emitVisible(false, y);
      }
    } else if (movingUp && !atBottom) {
      hideAnchorY = y;
      if (showAnchorY - y >= SHOW_DELTA) {
        emitVisible(true, y);
      }
    }

    lastY = y;
    ticking = false;
  }

  function handleScroll(e) {
    var t = e && e.target;
    if (t && t !== document && t !== window && t.scrollTop !== undefined) {
      scrollTarget = t;
    } else {
      scrollTarget = document.scrollingElement || document.documentElement;
    }
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });
  var main = document.querySelector('main');
  if (main && main.scrollHeight > main.clientHeight && !main._kdScrollAttached) {
    main._kdScrollAttached = true;
    main.addEventListener('scroll', handleScroll, { passive: true });
  }
  var next = document.getElementById('__next');
  if (next && next.scrollHeight > next.clientHeight && !next._kdScrollAttached) {
    next._kdScrollAttached = true;
    next.addEventListener('scroll', handleScroll, { passive: true });
  }

  var init = getScrollState();
  lastY = init.y;
  hideAnchorY = init.y;
  showAnchorY = init.y;
  true;
})();
`;

function buildHideHeaderJs() {
  const h = NATIVE_HEADER_HEIGHT;
  /* Inject CSS: hide site header/footer for embed; scope game full-width to /game and /juego only */
  return `
  (function() {
    try {
      var s = document.createElement('style');
      s.id = 'kd-embed-hide-header';
      var baseCss = 'header{display:none!important}footer{display:none!important}' +
        'body{padding-top:${h}px!important}main{padding-top:${h}px!important}' +
        '#__next{padding-top:${h}px!important}html{padding-top:0!important}' +
        '.kd-back-to-home{display:none!important}';

      // Only apply full-width container rules on game pages.
      // This prevents changing layout widths on Home/Feed/Hot Games/Top Ranked pages.
      var path = (window.location && window.location.pathname) ? String(window.location.pathname) : '';
      var isGamePage = path.startsWith('/game/') || path.startsWith('/juego/');
      var gameCss = isGamePage
        ? (
            'body.embed .max-w-7xl{max-width:100%!important;padding-left:0!important;padding-right:0!important}' +
            'body.embed .bg-white.rounded-none.shadow-lg{border-radius:0!important;margin-left:0!important;margin-right:0!important}' +
            'body.embed .bg-white.rounded-none.shadow-lg>div{padding-left:16px!important;padding-right:16px!important}' +
            'body.embed .bg-white.rounded-none.shadow-lg .p-8{padding-left:16px!important;padding-right:16px!important}'
          )
        : '';

      s.textContent = baseCss + gameCss;
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

function buildStatusBarPaddingJs(fullTopInset: number) {
  const h = NATIVE_HEADER_HEIGHT;
  return `
  (function() {
    var pt = ${fullTopInset};
    function apply() {
      try {
        var s = document.createElement('style');
        s.id = 'kd-embed-safe-area';
        s.textContent = ':root{--kd-safe-area-inset-top:' + pt + 'px}' +
          'body{padding-top:${h}px!important}main{padding-top:${h}px!important}#__next{padding-top:${h}px!important}';
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

/** Force chat layout in app WebView: fixed subheader, only .chat-scroll-body scrolls. No overlay – chat uses full header padding. */
function buildChatScrollJs() {
  return `
  (function() {
    try {
      var s = document.createElement('style');
      s.id = 'kd-embed-chat-scroll';
      s.textContent = 'body.embed:has(.chat-page){padding-top:0!important}' +
        'html,body{overflow:hidden!important;height:100%!important}' +
        'body.embed .chat-page{overflow:hidden!important;display:flex!important;flex-direction:column!important;height:100vh!important;max-height:100vh!important;padding-top:0!important}' +
        'body.embed .chat-page.chat-conversation-view{padding-top:0!important}' +
        'body.embed .chat-page .chat-view-header{position:fixed!important;top:0!important;left:0!important;right:0!important;z-index:10!important;background:#fff!important}' +
        'body.embed .chat-page .chat-scroll-body{flex:1 1 0!important;min-height:0!important;overflow:hidden!important;padding-top:56px!important;display:flex!important;flex-direction:column!important}' +
        'body.embed .chat-page .chat-conversation-wrap{flex:1 1 0!important;min-height:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important}' +
        'body.embed .chat-page .chat-conversation-wrap>div{flex:1 1 0!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}' +
        'body.embed .chat-messages-area{flex:1 1 0!important;min-height:0!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;padding-top:24px!important}';
      var old = document.getElementById('kd-embed-chat-scroll');
      if (old) old.remove();
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
    true;
  })();
`;
}

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

function buildAuthCookieJs(token: string | null) {
  const safeToken = token ? encodeURIComponent(token) : '';
  return `
  (function() {
    try {
      var securePart = window.location.protocol === 'https:' ? '; Secure' : '';
      if (${token ? 'true' : 'false'}) {
        document.cookie = 'auth_token=${safeToken}; Path=/; Max-Age=2592000; SameSite=Lax' + securePart;
      } else {
        document.cookie = 'auth_token=; Path=/; Max-Age=0; SameSite=Lax' + securePart;
      }
      document.cookie = 'kd-embed=1; Path=/; Max-Age=86400; SameSite=Lax' + securePart;
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
  disableScrollNav = false,
  debugWebView = false,
  onMessage,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { setLocale } = useLocale();
  const { setNavVisible } = useScrollNav();
  const { setImageModalOpen } = useImageModal();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewRef = useRef<WebView>(null);
  
  // Use refs to always have access to latest callbacks without recreating handleMessage
  const setNavVisibleRef = useRef(setNavVisible);
  const setImageModalOpenRef = useRef(setImageModalOpen);
  useEffect(() => { setNavVisibleRef.current = setNavVisible; }, [setNavVisible]);
  useEffect(() => { setImageModalOpenRef.current = setImageModalOpen; }, [setImageModalOpen]);

  const [debugLines, setDebugLines] = useState<string[]>([]);
  const pushDebug = useCallback((line: string) => {
    if (!debugWebView) return;
    const ts = new Date();
    const stamp = ts.toTimeString().slice(0, 8) + '.' + String(ts.getMilliseconds()).padStart(3, '0');
    setDebugLines((prev) => [`${stamp} ${line}`, ...prev].slice(0, 10));
  }, [debugWebView]);
  const base = API_BASE_URL.replace(/\/$/, '');
  const logoUri = `${base}/Logo.png`;
  const rawPath = path.startsWith('/') ? path : `/${path}`;
  const isVirtualToolsPath = rawPath.startsWith('/virtual-tools');
  const [pathPart, hash] = rawPath.includes('#') ? rawPath.split('#') : [rawPath, ''];
  const sep = pathPart.includes('?') ? '&' : '?';
  const withEmbed = embed ? `${pathPart}${sep}embed=1` : pathPart;
  const uri = `${base}${withEmbed}${hash ? `#${hash}` : ''}`;
  const headers = {
    ...(embed ? { 'x-kd-embed': '1' } : {}),
    'x-kd-client': 'mobile-app',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
  const needsOpenChat = path.includes('openChat=1');
  const isChatPath = path.includes('/chat');

  const navigation = useNavigation();
  const isOpenScreen = pathname === '/open' || (typeof pathname === 'string' && pathname.startsWith('/open'));

  // When on /open screen: swipe-back should first try WebView.goBack() if it has history
  useEffect(() => {
    if (!isOpenScreen) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (webViewRef.current?.canGoBack?.()) {
        e.preventDefault();
        webViewRef.current?.goBack?.();
      }
    });
    return unsubscribe;
  }, [isOpenScreen, navigation]);

  // Virtual Tools timers should pause when user leaves the screen or app backgrounds.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (isVirtualToolsPath) {
          webViewRef.current?.injectJavaScript(PAUSE_TIMERS_JS);
        }
        setImageModalOpen(false);
      };
    }, [isVirtualToolsPath, setImageModalOpen])
  );

  useEffect(() => {
    if (!isVirtualToolsPath) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        webViewRef.current?.injectJavaScript(PAUSE_TIMERS_JS);
      }
    });
    return () => sub.remove();
  }, [isVirtualToolsPath]);

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
        if (data?.type === 'localeChanged' && (data?.locale === 'en' || data?.locale === 'es')) {
          setLocale(data.locale);
          return;
        }
        if (data?.type === 'navigateToProfile' && data?.username) {
          router.push(`/profile/${data.username}` as any);
          onMessage?.(event);
          return;
        }
        if (data?.type === 'timer_timeout') {
          Vibration.vibrate(1000);
          return;
        }
        if (!disableScrollNav && data?.type === 'scroll' && typeof data.visible === 'boolean') {
          // Use ref to always get latest setNavVisible callback
          setNavVisibleRef.current(data.visible);
        }
        if (data?.type === 'imageModalOpen' && typeof data.open === 'boolean') {
          // Use ref to always get latest setImageModalOpen callback
          setImageModalOpenRef.current(data.open);
        }
      } catch {}
      onMessage?.(event);
    },
    [setLocale, onMessage, disableScrollNav, router]
  );

  const injectedJs = [
    hideWebHeader ? buildHideHeaderJs() : '',
    buildStatusBarPaddingJs(insets.top + NATIVE_HEADER_HEIGHT),
    needsOpenChat ? OPEN_CHAT_JS : '',
    isChatPath ? buildChatScrollJs() : '',
    interceptGameLinks ? buildGameLinkInterceptJs() : '',
    !disableScrollNav ? SCROLL_DETECT_JS : '',
  ].filter(Boolean).join('\n') || undefined;

  const pageBg = '#ffffff';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await apiClient.getToken();
        if (!mounted) return;
        setAuthToken(token);
      } finally {
        if (mounted) setAuthReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [path, reloadKey]);

  const injectedBeforeContentLoaded = hideWebHeader
    ? [buildAuthCookieJs(authToken), buildHideHeaderJs(), buildBackgroundJs(pageBg)].join('\n')
    : [buildAuthCookieJs(authToken), buildBackgroundJs(pageBg)].join('\n');

  // Load timeout - game pages fetch from Supabase and can take a while
  useEffect(() => {
    setLoadError(null);
    setLoading(true);
    pushDebug(`timeout-arm uri=${uri}`);
    timeoutRef.current = setTimeout(() => {
      setLoadError('Page took too long to load. Check your connection and try again.');
      setLoading(false);
      pushDebug(`timeout-fire uri=${uri}`);
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [uri, pushDebug]);

  const handleLoadEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoadError(null);
    setLoading(false);
    pushDebug(`loadEnd`);
  }, [pushDebug]);

  const handleHttpError = useCallback((syntheticEvent: { nativeEvent: { description: string; statusCode: number } }) => {
    const { statusCode } = syntheticEvent.nativeEvent;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoading(false);
    setLoadError(statusCode === 404 ? 'Page not found.' : `Failed to load (${statusCode}). Try again.`);
    pushDebug(`httpError status=${statusCode}`);
  }, [pushDebug]);

  const retryLoad = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
    pushDebug(`retry`);
  }, [pushDebug]);


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

  // Intercept game links and deep links (forum posts, etc.) for native stack / swipe-back
  const handleShouldStartLoad = useCallback(
    (request: { url: string; navigationType?: string }) => {
      pushDebug(`shouldStart url=${String(request?.url || '')} type=${String(request?.navigationType || '')}`);
      if (interceptGameLinks && shouldInterceptGameLink(request.url)) return false;
      try {
        const url = new URL(request.url);
        const ourHost = new URL(base).hostname;
        if (url.hostname !== ourHost && url.hostname !== 'kingdice.gg' && url.hostname !== 'www.kingdice.gg') {
          return true;
        }
        const targetPath = url.pathname || '/';
        const isOnTab = pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index' ||
          pathname === '/(tabs)/feed' || pathname === '/(tabs)/chat' || pathname === '/(tabs)/collection' || pathname === '/(tabs)/profile';
        const isSamePath = targetPath === rawPath || targetPath === pathPart;
        if (isOnTab && !isSamePath && (targetPath.startsWith('/forums/post/') || targetPath.startsWith('/collection/') || targetPath.startsWith('/profile/'))) {
          router.push(`/open?path=${encodeURIComponent(url.pathname + url.search)}` as any);
          return false;
        }
      } catch {}
      return true;
    },
    [base, interceptGameLinks, pathname, pathPart, rawPath, router, shouldInterceptGameLink, pushDebug]
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
            </>
          )}
        </View>
      )}
      {authReady && (
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
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          injectedJavaScriptBeforeContentLoaded={injectedBeforeContentLoaded}
          injectedJavaScript={injectedJs}
          onLoadStart={() => { 
            setLoading(true); 
            setLoadError(null); 
            pushDebug(`loadStart uri=${uri}`);
          }}
          onLoadEnd={handleLoadEnd}
          onHttpError={handleHttpError}
          onNavigationStateChange={(navState) => {
            pushDebug(`navState loading=${String(!!navState.loading)} url=${String((navState as any)?.url || '')}`);
            if (!navState.loading) {
              setLoading(false);
            }
          }}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onMessage={handleMessage}
        />
      )}

      {debugWebView && (
        <View pointerEvents="none" style={[styles.debugOverlay, { bottom: (padBottom !== false ? 90 : 12) + insets.bottom }]}>
          <Text style={styles.debugTitle}>WebView debug (loading={String(loading)})</Text>
          {debugLines.map((l, idx) => (
            <Text key={`${idx}-${l}`} style={styles.debugLine} numberOfLines={1}>
              {l}
            </Text>
          ))}
        </View>
      )}
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
    marginBottom: 64,
  },
  webviewHidden: { opacity: 0 },
  debugOverlay: {
    position: 'absolute',
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    zIndex: 50,
  },
  debugTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  debugLine: { color: '#fff', fontSize: 11, fontFamily: 'monospace' },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#fbae17',
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
