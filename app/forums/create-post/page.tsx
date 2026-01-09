'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bold,
  Italic,
  Strikethrough,
  Quote,
  Code,
  List,
  ListOrdered,
  Image as ImageIcon,
  Save,
  Send,
  X,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import ModerationAlert from '@/components/ModerationAlert';
import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import LoginModal from '@/components/LoginModal';

type Draft = {
  id: string;
  title: string;
  category: string;
  contentHtml: string;
  updatedAt: string;
};

const DRAFTS_KEY = 'kd-forums-create-post-drafts-v1';
const DRAFT_AUTOSAVE_MS = 800;

const DEFAULT_CATEGORIES = [
  { id: 'general', name: 'General Discussion', color: 'bg-blue-100 text-blue-800' },
  { id: 'strategy', name: 'Strategy & Tips', color: 'bg-green-100 text-green-800' },
  { id: 'reviews', name: 'Reviews & Recommendations', color: 'bg-purple-100 text-purple-800' }
];

function nowIso() {
  return new Date().toISOString();
}

function loadDrafts(): Draft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean);
  } catch {
    return [];
  }
}

function saveDrafts(drafts: Draft[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

function upsertDraft(next: Draft) {
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === next.id);
  const updated = idx === -1 ? [next, ...drafts] : drafts.map(d => (d.id === next.id ? next : d));
  saveDrafts(updated);
}

function deleteDraft(id: string) {
  const drafts = loadDrafts().filter(d => d.id !== id);
  saveDrafts(drafts);
}

function formatDraftTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function applyWrap(
  textarea: HTMLTextAreaElement | null,
  value: string,
  wrapLeft: string,
  wrapRight: string
) {
  if (!textarea) return { value, nextCursorStart: null as number | null, nextCursorEnd: null as number | null };
  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? value.length;
  const selected = value.slice(start, end);
  const next = value.slice(0, start) + wrapLeft + selected + wrapRight + value.slice(end);
  const nextStart = start + wrapLeft.length;
  const nextEnd = end + wrapLeft.length;
  return { value: next, nextCursorStart: nextStart, nextCursorEnd: nextEnd };
}

function applyPrefixLines(textarea: HTMLTextAreaElement | null, value: string, prefix: string) {
  if (!textarea) return { value, nextCursorStart: null as number | null, nextCursorEnd: null as number | null };
  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? value.length;
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);

  const lines = (selected || '').split('\n');
  const prefixed = lines.map(l => (l.startsWith(prefix) ? l : `${prefix}${l}`)).join('\n');
  const next = before + prefixed + after;
  const nextStart = start;
  const nextEnd = start + prefixed.length;
  return { value: next, nextCursorStart: nextStart, nextCursorEnd: nextEnd };
}

function htmlToMarkdown(html: string): string {
  if (!html?.trim()) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const normalizeText = (s: string) =>
    s
      .replace(/\u00a0/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const walk = (node: Node, listMode: 'ul' | 'ol' | null = null, olIndexRef?: { i: number }): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '').replace(/\u200D/g, '\u200D'); // keep ZWJ
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') return '\n';
    if (tag === 'strong' || tag === 'b') return `**${Array.from(el.childNodes).map(n => walk(n, listMode, olIndexRef)).join('')}**`;
    if (tag === 'em' || tag === 'i') return `*${Array.from(el.childNodes).map(n => walk(n, listMode, olIndexRef)).join('')}*`;
    if (tag === 'u') return `__${Array.from(el.childNodes).map(n => walk(n, listMode, olIndexRef)).join('')}__`;
    if (tag === 's' || tag === 'del' || tag === 'strike') return `~~${Array.from(el.childNodes).map(n => walk(n, listMode, olIndexRef)).join('')}~~`;
    if (tag === 'code') return `\`${Array.from(el.childNodes).map(n => walk(n, listMode, olIndexRef)).join('')}\``;
    if (tag === 'pre') {
      const text = el.textContent || '';
      return `\n\n\`\`\`\n${text.replace(/\n+$/g, '')}\n\`\`\`\n\n`;
    }
    if (tag === 'blockquote') {
      const inner = Array.from(el.childNodes).map(n => walk(n, listMode, olIndexRef)).join('');
      return `\n\n${inner.split('\n').map(l => (l.trim() ? `> ${l}` : '>')).join('\n')}\n\n`;
    }
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      const text = Array.from(el.childNodes).map(n => walk(n, listMode, olIndexRef)).join('') || href;
      return href ? `[${text}](${href})` : text;
    }
    if (tag === 'img') {
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || '';
      return src ? `![${alt}](${src})` : '';
    }
    if (tag === 'ul') {
      const inner = Array.from(el.children).map(li => walk(li, 'ul')).join('');
      return `\n${inner}\n`;
    }
    if (tag === 'ol') {
      const ref = { i: 1 };
      const inner = Array.from(el.children).map(li => walk(li, 'ol', ref)).join('');
      return `\n${inner}\n`;
    }
    if (tag === 'li') {
      const inner = Array.from(el.childNodes).map(n => walk(n, listMode, olIndexRef)).join('').replace(/\n+/g, ' ').trim();
      if (listMode === 'ol') {
        const num = olIndexRef ? olIndexRef.i++ : 1;
        return `${num}. ${inner}\n`;
      }
      return `- ${inner}\n`;
    }
    if (tag === 'p' || tag === 'div') {
      const inner = Array.from(el.childNodes).map(n => walk(n, listMode, olIndexRef)).join('');
      return `${inner}\n\n`;
    }

    return Array.from(el.childNodes).map(n => walk(n, listMode, olIndexRef)).join('');
  };

  const raw = Array.from(doc.body.childNodes).map(n => walk(n)).join('');
  return normalizeText(raw);
}

export default function CreatePostPage() {
  const t = useTranslations('forums');
  const tCommon = useTranslations('common');
  const tChat = useTranslations('chat');
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [moderationAlert, setModerationAlert] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [contentHtml, setContentHtml] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Drafts
  const [draftId, setDraftId] = useState<string>(() => `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDraftsState] = useState<Draft[]>([]);
  const autosaveTimer = useRef<any>(null);

  // Image upload state (insert into text)
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; name: string }>>([]);

  const categories = useMemo(() => {
    // keep ids stable; labels can be translated later if we add i18n for category names
    return DEFAULT_CATEGORIES;
  }, []);

  const tf = (key: string, fallback: string) => {
    const anyT = t as any;
    if (typeof anyT?.has === 'function') {
      return anyT.has(key) ? t(key as any) : fallback;
    }
    // If next-intl version doesn't support `has`, just attempt and fallback to avoid crashes
    try {
      return t(key as any);
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    setDraftsState(loadDrafts());
  }, []);

  // Autosave draft
  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      // Don’t autosave totally empty drafts
      const contentText = htmlToMarkdown(contentHtml);
      if (!title.trim() && !contentText.trim()) return;
      const next: Draft = { id: draftId, title, category, contentHtml, updatedAt: nowIso() };
      upsertDraft(next);
      setDraftsState(loadDrafts());
    }, DRAFT_AUTOSAVE_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [title, contentHtml, category, draftId]);

  const focusEditor = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
  };

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const exec = (command: string, value?: string) => {
    focusEditor();
    try {
      document.execCommand(command, false, value);
    } catch {
      // ignore
    }
    // Sync state from DOM
    if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
  };

  const onFormat = (kind: string) => {
    if (kind === 'bold') exec('bold');
    else if (kind === 'italic') exec('italic');
    else if (kind === 'underline') exec('underline');
    else if (kind === 'strike') exec('strikeThrough');
    else if (kind === 'bullets') exec('insertUnorderedList');
    else if (kind === 'numbers') exec('insertOrderedList');
    else if (kind === 'quote') {
      const selText = typeof window !== 'undefined' ? (window.getSelection()?.toString() || '') : '';
      const text = selText.trim();
      const body = escapeHtml(text || tf('quote', 'Quote')).replace(/\n/g, '<br/>');
      exec('insertHTML', `<blockquote><p>${body}</p></blockquote><p><br/></p>`);
    } else if (kind === 'code') {
      const selText = typeof window !== 'undefined' ? (window.getSelection()?.toString() || '') : '';
      const text = selText.trim();
      const body = escapeHtml(text || 'code').replace(/\n/g, '\n');
      exec('insertHTML', `<pre><code>${body}</code></pre><p><br/></p>`);
    }
  };

  const insertHtmlAtCursor = (html: string) => {
    exec('insertHTML', html);
  };

  const handleUploadImage = async (file: File) => {
    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
      return;
    }
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('type', 'forum-post');
      const resp = await fetch('/api/upload', { method: 'POST', body: form });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        showToast(err.error || 'Upload failed', 'error');
        return;
      }
      const data = await resp.json();
      const url = data?.url;
      if (!url) {
        showToast('Upload failed', 'error');
        return;
      }
      setUploadedImages(prev => [{ url, name: file.name }, ...prev]);
      // Insert image into rich editor
      insertHtmlAtCursor(`<p><img src="${url}" alt="${file.name}" style="max-width:100%;height:auto;" /></p><p><br/></p>`);
      showToast('Image uploaded', 'success');
    } catch (e) {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDraft = () => {
    const next: Draft = { id: draftId, title, category, contentHtml, updatedAt: nowIso() };
    upsertDraft(next);
    setDraftsState(loadDrafts());
    showToast(t('draftSaved'), 'success');
  };

  const handleLoadDraft = (d: Draft) => {
    setDraftId(d.id);
    setTitle(d.title || '');
    setCategory(d.category || 'general');
    setContentHtml(d.contentHtml || '');
    setDraftsOpen(false);
    showToast(t('draftLoaded'), 'success');
    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = d.contentHtml || '';
      }
    });
  };

  const handleDeleteDraft = (id: string) => {
    deleteDraft(id);
    setDraftsState(loadDrafts());
    showToast(t('draftDeleted'), 'success');
  };

  const handlePublish = async () => {
    const markdownContent = htmlToMarkdown(editorRef.current?.innerHTML || contentHtml);
    if (!title.trim() || !markdownContent.trim()) {
      showToast(t('fillTitleAndContent'), 'error');
      return;
    }
    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const contentWithLinks = markdownContent;

      // Pre-moderate for UX (API also moderates)
      const [titleRes, contentRes] = await Promise.all([
        fetch('/api/moderate/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: title })
        }),
        fetch('/api/moderate/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: contentWithLinks })
        })
      ]);
      const titleModeration = await titleRes.json();
      const contentModeration = await contentRes.json();
      if (!titleModeration.isAppropriate || !contentModeration.isAppropriate) {
        const rejected = !titleModeration.isAppropriate ? titleModeration : contentModeration;
        setModerationAlert({ result: rejected, type: 'rejected' });
        setLoading(false);
        return;
      }

      const postData = {
        title: title.trim(),
        content: contentWithLinks.trim(),
        category,
        author: {
          id: user.id,
          name: user.username,
          avatar: user.avatar,
          title: (user as any).title ?? null
        }
      };

      const resp = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        showToast(err.error || t('postCreateFailed'), 'error');
        return;
      }

      const result = await resp.json();
      // Remove draft after successful publish
      deleteDraft(draftId);
      setDraftsState(loadDrafts());
      showToast(t('postCreated'), 'success');

      // Navigate to the new post
      const newId = result?.post?.id;
      if (newId) router.push(`/forums/post/${newId}`);
      else router.push('/forums');
    } catch (e) {
      showToast(t('postCreateFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingScreen />}

      <div className="max-w-4xl mx-auto px-0 sm:px-6 py-6">
        <div className="px-4 sm:px-0">
          <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push('/forums')}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToForums')}
            </button>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
              {t('createPostPageTitle')}
            </h1>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraftsOpen(v => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('drafts')} ({drafts.length})
              <ChevronDown className="w-4 h-4" />
            </button>

            {draftsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[85vw] bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{t('drafts')}</div>
                  <button
                    type="button"
                    onClick={() => setDraftsOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    aria-label={tCommon('close')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {drafts.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-gray-500">{t('noDrafts')}</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {drafts.map(d => (
                      <div key={d.id} className="px-3 py-2 border-b border-gray-100">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadDraft(d)}
                            className="text-left min-w-0"
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {d.title?.trim() ? d.title : t('untitled')}
                            </div>
                            <div className="text-xs text-gray-500">{formatDraftTime(d.updatedAt)}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(d.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            aria-label={tCommon('delete')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden">
          {/* Header bar */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex gap-1 p-2">
              <div className="px-3 py-2 text-sm font-medium text-gray-700">
                {t('tabText')}
              </div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-white/60 inline-flex items-center gap-2"
                title={t('saveDraft')}
              >
                <Save className="w-4 h-4" />
                {t('saveDraft')}
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('title')}</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={tf('enterPostTitle', 'Enter your post title...')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Editor toolbar */}
            <div className="flex flex-wrap items-center gap-1 border border-gray-200 rounded-lg p-2 bg-white">
              <button type="button" onClick={() => onFormat('bold')} className="p-2 rounded hover:bg-gray-100" title={t('bold')}>
                <Bold className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onFormat('italic')} className="p-2 rounded hover:bg-gray-100" title={t('italic')}>
                <Italic className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onFormat('underline')} className="p-2 rounded hover:bg-gray-100" title={t('underline')}>
                <span className="text-sm font-semibold underline">U</span>
              </button>
              <button type="button" onClick={() => onFormat('strike')} className="p-2 rounded hover:bg-gray-100" title={t('strike')}>
                <Strikethrough className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button type="button" onClick={() => onFormat('quote')} className="p-2 rounded hover:bg-gray-100" title={t('quote')}>
                <Quote className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onFormat('code')} className="p-2 rounded hover:bg-gray-100" title={t('codeBlock')}>
                <Code className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button type="button" onClick={() => onFormat('bullets')} className="p-2 rounded hover:bg-gray-100" title={t('bullets')}>
                <List className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onFormat('numbers')} className="p-2 rounded hover:bg-gray-100" title={t('numbers')}>
                <ListOrdered className="w-4 h-4" />
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 inline-flex items-center gap-2"
                title={t('addImage')}
              >
                <ImageIcon className="w-4 h-4" />
                {t('addImage')}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadImage(file);
                  e.currentTarget.value = '';
                }}
              />
            </div>

            {/* Tab content */}
            <div className="relative">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
                }}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[240px] prose max-w-none"
                data-placeholder={tf('writePostContent', 'Write your post content... (use @ to mention games)')}
                style={{
                  position: 'relative'
                }}
              />
              <style jsx>{`
                [contenteditable][data-placeholder]:empty:before {
                  content: attr(data-placeholder);
                  color: #9ca3af;
                }
              `}</style>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white p-4 sm:p-6 flex flex-col sm:flex-row gap-3 justify-end">
            <Link
              href="/forums"
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-center"
            >
              {tCommon('cancel')}
            </Link>
            <button
              type="button"
              onClick={handlePublish}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 inline-flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={loading}
            >
              <Send className="w-4 h-4" />
              {t('publish')}
            </button>
          </div>
        </div>

        {moderationAlert && (
          <div className="mt-6">
            <ModerationAlert
              result={moderationAlert.result}
              type={moderationAlert.type}
              onDismiss={() => setModerationAlert(null)}
              showDetails={true}
            />
          </div>
        )}
      </div>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
}

