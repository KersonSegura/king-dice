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
  Link as LinkIcon,
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
import { useGameMentions } from '@/hooks/useGameMentions';

type Draft = {
  id: string;
  title: string;
  category: string;
  content: string;
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
  const [tab, setTab] = useState<'text' | 'images' | 'link'>('text');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [content, setContent] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Drafts
  const [draftId, setDraftId] = useState<string>(() => `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDraftsState] = useState<Draft[]>([]);
  const autosaveTimer = useRef<any>(null);

  // Link tab state
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Images tab state
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

  const {
    showMentionDropdown,
    mentionQuery,
    mentionSearchQuery,
    handleMentionSearchInputChange,
    closeMentionDropdown,
    mentionResults,
    selectedMentionIndex,
    mentionDropdownRef,
    handleTyping: handleContentTyping,
    handleKeyPress: handleContentKeyPress,
    insertGameMention,
    convertGameMentionsToMarkdown
  } = useGameMentions(content, setContent, contentRef);

  useEffect(() => {
    setDraftsState(loadDrafts());
  }, []);

  // Autosave draft
  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      // Don’t autosave totally empty drafts
      if (!title.trim() && !content.trim()) return;
      const next: Draft = { id: draftId, title, category, content, updatedAt: nowIso() };
      upsertDraft(next);
      setDraftsState(loadDrafts());
    }, DRAFT_AUTOSAVE_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [title, content, category, draftId]);

  const setSelection = (nextStart: number | null, nextEnd: number | null) => {
    if (!contentRef.current) return;
    if (nextStart === null || nextEnd === null) return;
    contentRef.current.focus();
    contentRef.current.setSelectionRange(nextStart, nextEnd);
  };

  const onFormat = (kind: string) => {
    if (!contentRef.current) return;
    if (kind === 'bold') {
      const r = applyWrap(contentRef.current, content, '**', '**');
      setContent(r.value);
      setSelection(r.nextCursorStart, r.nextCursorEnd);
    } else if (kind === 'italic') {
      const r = applyWrap(contentRef.current, content, '*', '*');
      setContent(r.value);
      setSelection(r.nextCursorStart, r.nextCursorEnd);
    } else if (kind === 'strike') {
      const r = applyWrap(contentRef.current, content, '~~', '~~');
      setContent(r.value);
      setSelection(r.nextCursorStart, r.nextCursorEnd);
    } else if (kind === 'quote') {
      const r = applyPrefixLines(contentRef.current, content, '> ');
      setContent(r.value);
      setSelection(r.nextCursorStart, r.nextCursorEnd);
    } else if (kind === 'code') {
      const r = applyWrap(contentRef.current, content, '`', '`');
      setContent(r.value);
      setSelection(r.nextCursorStart, r.nextCursorEnd);
    } else if (kind === 'bullets') {
      const r = applyPrefixLines(contentRef.current, content, '- ');
      setContent(r.value);
      setSelection(r.nextCursorStart, r.nextCursorEnd);
    } else if (kind === 'numbers') {
      const r = applyPrefixLines(contentRef.current, content, '1. ');
      setContent(r.value);
      setSelection(r.nextCursorStart, r.nextCursorEnd);
    }
  };

  const insertAtCursor = (text: string) => {
    const ta = contentRef.current;
    if (!ta) {
      setContent(prev => prev + text);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + text.length;
      ta.setSelectionRange(cursor, cursor);
    });
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
      // Insert markdown image into content (append on a new line)
      const md = `\n\n![${file.name}](${url})\n`;
      insertAtCursor(md);
      setTab('text');
      showToast('Image uploaded', 'success');
    } catch (e) {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDraft = () => {
    const next: Draft = { id: draftId, title, category, content, updatedAt: nowIso() };
    upsertDraft(next);
    setDraftsState(loadDrafts());
    showToast(t('draftSaved'), 'success');
  };

  const handleLoadDraft = (d: Draft) => {
    setDraftId(d.id);
    setTitle(d.title || '');
    setCategory(d.category || 'general');
    setContent(d.content || '');
    setDraftsOpen(false);
    showToast(t('draftLoaded'), 'success');
  };

  const handleDeleteDraft = (id: string) => {
    deleteDraft(id);
    setDraftsState(loadDrafts());
    showToast(t('draftDeleted'), 'success');
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    const label = (linkText || linkUrl).trim();
    insertAtCursor(`\n\n[${label}](${linkUrl.trim()})\n`);
    setTab('text');
    setLinkText('');
    setLinkUrl('');
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
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
      const contentWithLinks = convertGameMentionsToMarkdown(content);

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
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

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex gap-1 p-2">
              <button
                type="button"
                onClick={() => setTab('text')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  tab === 'text' ? 'bg-white border border-gray-200 text-gray-900' : 'text-gray-600 hover:bg-white/60'
                }`}
              >
                {t('tabText')}
              </button>
              <button
                type="button"
                onClick={() => setTab('images')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  tab === 'images' ? 'bg-white border border-gray-200 text-gray-900' : 'text-gray-600 hover:bg-white/60'
                }`}
              >
                {t('tabImages')}
              </button>
              <button
                type="button"
                onClick={() => setTab('link')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  tab === 'link' ? 'bg-white border border-gray-200 text-gray-900' : 'text-gray-600 hover:bg-white/60'
                }`}
              >
                {t('tabLink')}
              </button>
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
              <button type="button" onClick={() => onFormat('strike')} className="p-2 rounded hover:bg-gray-100" title={t('strike')}>
                <Strikethrough className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button type="button" onClick={() => onFormat('quote')} className="p-2 rounded hover:bg-gray-100" title={t('quote')}>
                <Quote className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onFormat('code')} className="p-2 rounded hover:bg-gray-100" title={t('code')}>
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
                onClick={() => setTab('images')}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 inline-flex items-center gap-2"
                title={t('tabImages')}
              >
                <ImageIcon className="w-4 h-4" />
                {t('addImage')}
              </button>
              <button
                type="button"
                onClick={() => setTab('link')}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 inline-flex items-center gap-2"
                title={t('tabLink')}
              >
                <LinkIcon className="w-4 h-4" />
                {t('addLink')}
              </button>
            </div>

            {/* Tab content */}
            {tab === 'text' && (
              <div className="relative">
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={handleContentTyping}
                  onKeyDown={handleContentKeyPress}
                  placeholder={tf('writePostContent', 'Write your post content... (use @ to mention games)')}
                  rows={10}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                />

                {/* Game Mention Dropdown */}
                {showMentionDropdown && (
                  <div
                    ref={mentionDropdownRef}
                    className="absolute left-0 bottom-full mb-2 w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden flex flex-col"
                  >
                    <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200 flex items-center justify-between">
                      <span>{tChat('linkGames')}</span>
                      <button
                        type="button"
                        onClick={closeMentionDropdown}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        aria-label={tCommon('close')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="px-3 py-2 border-b border-gray-200 bg-white">
                      <input
                        value={mentionSearchQuery}
                        onChange={(e) => handleMentionSearchInputChange(e.target.value)}
                        onKeyDown={(e) => handleContentKeyPress(e as any)}
                        placeholder={tChat('searchGame')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    {mentionResults.length > 0 ? (
                      <div className="py-1 overflow-y-auto flex-1 min-h-0 pb-1">
                        {mentionResults.map((game, index) => (
                          <button
                            key={game.id}
                            onClick={() => insertGameMention(game)}
                            className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors ${
                              index === selectedMentionIndex ? 'bg-blue-100' : ''
                            }`}
                          >
                            <div className="font-medium text-sm text-gray-900">{game.nameEn || game.name}</div>
                            {game.yearRelease && <div className="text-xs text-gray-500">{game.yearRelease}</div>}
                          </button>
                        ))}
                      </div>
                    ) : mentionQuery.length > 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">{tChat('noGamesFound')}</div>
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">{tChat('typeToSearchGames')}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 'images' && (
              <div className="space-y-3">
                <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border border-gray-200">
                      <ImageIcon className="w-5 h-5 text-gray-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900">{t('uploadImages')}</div>
                      <div className="text-xs text-gray-600">{t('uploadImagesHint')}</div>
                    </div>
                    <div className="flex-1" />
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer text-sm">
                      <input
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
                      <ImageIcon className="w-4 h-4" />
                      {uploading ? t('uploading') : t('chooseImage')}
                    </label>
                  </div>
                </div>

                {uploadedImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">{t('uploadedImages')}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {uploadedImages.map(img => (
                        <div key={img.url} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <div className="aspect-video bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="p-3">
                            <div className="text-xs text-gray-600 truncate">{img.name}</div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
                                onClick={() => {
                                  insertAtCursor(`\n\n![${img.name}](${img.url})\n`);
                                  setTab('text');
                                }}
                              >
                                {t('insert')}
                              </button>
                              <Link href={img.url} target="_blank" className="text-sm text-primary-600 hover:underline">
                                {t('open')}
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'link' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('linkText')}</label>
                    <input
                      value={linkText}
                      onChange={e => setLinkText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder={t('linkTextPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('linkUrl')}</label>
                    <input
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleInsertLink}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                  disabled={!linkUrl.trim()}
                >
                  <LinkIcon className="w-4 h-4" />
                  {t('insertLink')}
                </button>
              </div>
            )}
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

