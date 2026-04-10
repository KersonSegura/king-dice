/**
 * Create post - Step 2: Category, description, tags, then Upload
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../../contexts/LocaleContext';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../lib/api-client';
import { getApiBaseUrl } from '../../config/api';
/**
 * SDK 54+: `import 'expo-file-system'` exposes stubs that THROW for getInfoAsync/readAsStringAsync/etc.
 * Real implementations live in `expo-file-system/legacy` (see legacyWarnings in the main package).
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { getPendingImageUri, clearPendingImageUri } from './pendingImageUri';

/** Prepare a local file:// URI for multipart upload.
 * iOS: copyAsync/base64 often fail for ph://, iCloud placeholders, and some file:// temp paths; ImageManipulator materializes a real JPEG first.
 * Android: content:// is handled by manipulator or copy.
 */
async function prepareImageForUpload(sourceUri: string): Promise<{ uri: string; fileName: string }> {
  const fileName = `upload-${Date.now()}.jpg`;
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('cache directory unavailable');
  }
  const cacheUri = `${cacheDir}${fileName}`;

  try {
    const result = await ImageManipulator.manipulateAsync(sourceUri, [], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    // Prefer embedded base64 so we always materialize bytes even if getInfoAsync omits size on some iOS builds.
    if (result.base64 && result.base64.length > 0) {
      await FileSystem.writeAsStringAsync(cacheUri, result.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return { uri: cacheUri, fileName };
    }
    const info = await FileSystem.getInfoAsync(result.uri);
    const rawSize = info.exists && 'size' in info ? (info as { size?: number }).size : undefined;
    const hasBytes = info.exists && rawSize !== 0 && (rawSize === undefined || (rawSize ?? 0) > 0);
    if (hasBytes) {
      return { uri: result.uri, fileName };
    }
  } catch (e) {
    console.warn('prepareImageForUpload: manipulateAsync/materialize failed', e);
  }

  try {
    await FileSystem.copyAsync({ from: sourceUri, to: cacheUri });
    const info = await FileSystem.getInfoAsync(cacheUri);
    const size = info.exists && 'size' in info ? (info as { size?: number }).size : 0;
    if (info.exists && size && size > 0) {
      return { uri: cacheUri, fileName };
    }
    await FileSystem.deleteAsync(cacheUri, { idempotent: true }).catch(() => {});
  } catch (e) {
    console.warn('prepareImageForUpload: copyAsync failed', e);
  }

  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64 || base64.length === 0) {
    throw new Error('empty or unreadable image');
  }
  await FileSystem.writeAsStringAsync(cacheUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri: cacheUri, fileName };
}

/** React Native: fetch() + FormData often sends an empty file part on iOS; XHR multipart matches browser behavior. */
function galleryUploadWithXHR(
  url: string,
  formData: FormData,
  token: string
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'text';
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        if (xhr.responseText) data = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        data = {};
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.send(formData as any);
  });
}

const CATEGORIES = [
  { id: 'collections', nameKey: 'categoryGameCollections' },
  { id: 'dice-throne', nameKey: 'categoryDiceThrone' },
  { id: 'the-kings-card', nameKey: 'categoryKingsCard' },
  { id: 'setups', nameKey: 'categorySetups' },
  { id: 'events', nameKey: 'categoryEvents' },
];

const FOOTER_APPROX_HEIGHT = 70;
const HEADER_APPROX_HEIGHT = 56;

export default function CreatePostDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ imageUri: string }>();
  // Prefer in-memory URI so long file:// paths are not truncated by route params (which caused 0-byte uploads)
  const imageUri = getPendingImageUri() ?? params.imageUri ?? undefined;
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [description, setDescription] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const descSectionRef = useRef<View>(null);
  const tagsSectionRef = useRef<View>(null);
  const contentHeightRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const focusedSectionRef = useRef<'desc' | 'tags' | null>(null);

  const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);

  const scrollToSection = (sectionRef: React.RefObject<View>, kbHeight: number) => {
    if (!scrollRef.current || !scrollContentRef.current || !sectionRef.current) return;
    sectionRef.current.measureLayout(
      scrollContentRef.current as any,
      (_x: number, y: number, _w: number, sectionHeight: number) => {
        const scrollViewHeight = height - insets.top - HEADER_APPROX_HEIGHT;
        const visibleHeight = kbHeight > 0
          ? scrollViewHeight - kbHeight - FOOTER_APPROX_HEIGHT
          : scrollViewHeight - FOOTER_APPROX_HEIGHT;
        const contentHeight = contentHeightRef.current;
        const scrollY = Math.max(
          0,
          Math.min(
            y - (visibleHeight - sectionHeight) / 2,
            contentHeight - scrollViewHeight
          )
        );
        scrollRef.current?.scrollTo({ y: scrollY, animated: true });
      }
    );
  };

  useEffect(() => {
    keyboardHeightRef.current = keyboardHeight;
  }, [keyboardHeight]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      const kbHeight = e.endCoordinates.height;
      setKeyboardHeight(kbHeight);
      keyboardHeightRef.current = kbHeight;
      if (focusedSectionRef.current === 'desc') {
        setTimeout(() => scrollToSection(descSectionRef, kbHeight), 50);
        focusedSectionRef.current = null;
      } else if (focusedSectionRef.current === 'tags') {
        setTimeout(() => scrollToSection(tagsSectionRef, kbHeight), 50);
        focusedSectionRef.current = null;
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      keyboardHeightRef.current = 0;
      focusedSectionRef.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [height, insets.top]);

  const handleCancel = () => {
    clearPendingImageUri();
    router.replace('/');
  };

  const handleUpload = async () => {
    if (!imageUri) {
      Alert.alert(t('uploadFailed'), t('errorNoImageSelected'));
      return;
    }
    setUploading(true);
    try {
      const token = await apiClient.getToken();
      if (!token) {
        Alert.alert(t('uploadFailed'), t('errorSignInRequired'));
        setUploading(false);
        return;
      }

      let uploadUri: string;
      let uploadFileName: string;
      try {
        const prepared = await prepareImageForUpload(imageUri);
        uploadUri = prepared.uri;
        uploadFileName = prepared.fileName;
      } catch (e) {
        console.error('Prepare image for upload failed', e);
        Alert.alert(t('uploadFailed'), t('errorImageEmptyOrInvalid'));
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', {
        uri: uploadUri,
        type: 'image/jpeg',
        name: uploadFileName,
      } as any);
      formData.append('title', '');
      formData.append('description', description);
      formData.append('category', category);
      if (tags.length) formData.append('tags', tags.join(','));

      const uploadUrl = `${getApiBaseUrl()}/api/gallery/upload`;
      const { ok, data } = await galleryUploadWithXHR(uploadUrl, formData, token);
      if (!ok) {
        Alert.alert(t('uploadFailed'), String(data.error ?? t('errorTryAgain')));
        setUploading(false);
        return;
      }
      clearPendingImageUri();
      FileSystem.deleteAsync(uploadUri, { idempotent: true }).catch(() => {});
      Alert.alert(t('uploadSuccess'), t('uploadSuccessMessage'), [
        { text: 'OK', onPress: () => router.replace('/community-gallery') },
      ]);
    } catch (e) {
      console.error('Upload error', e);
      Alert.alert(t('uploadFailed'), t('errorTryAgain'));
    } finally {
      setUploading(false);
    }
  };

  if (!imageUri) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{t('errorNoImageSelected')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedCategory = CATEGORIES.find((c) => c.id === category);
  const categoryLabel = selectedCategory ? t(selectedCategory.nameKey) : category;

  const footerBottom = keyboardHeight > 0 ? keyboardHeight + 8 : insets.bottom + 12;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e1e1e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('newPost')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + footerBottom }]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={(_w, h) => { contentHeightRef.current = h; }}
      >
        <View ref={scrollContentRef} collapsable={false}>
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{t('category')}</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Text style={styles.dropdownText}>{categoryLabel}</Text>
              <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            </TouchableOpacity>
            {showCategoryDropdown && (
              <View style={styles.dropdownList}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCategory(c.id);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{t(c.nameKey)}</Text>
                    {category === c.id && <Ionicons name="checkmark" size={20} color="#3797f0" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View ref={descSectionRef} collapsable={false}>
              <Text style={styles.label}>{t('descriptionOptional')}</Text>
              <TextInput
                style={styles.textArea}
                placeholder={t('descriptionPlaceholder')}
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                onFocus={() => {
                  focusedSectionRef.current = 'desc';
                  setTimeout(() => scrollToSection(descSectionRef, keyboardHeightRef.current), 400);
                }}
                multiline
                numberOfLines={3}
              />
            </View>

            <View ref={tagsSectionRef} collapsable={false}>
              <Text style={styles.label}>{t('tagsOptional')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('tagsPlaceholder')}
                placeholderTextColor="#9ca3af"
                value={tagsStr}
                onChangeText={setTagsStr}
                onFocus={() => {
                  focusedSectionRef.current = 'tags';
                  setTimeout(() => scrollToSection(tagsSectionRef, keyboardHeightRef.current), 400);
                }}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { bottom: footerBottom, paddingBottom: 12 }]}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={uploading}>
          <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.uploadBtnText}>{t('uploadImage')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1e1e1e' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  previewWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: 20,
  },
  previewImage: { width: '100%', height: '100%' },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
  },
  dropdownText: { fontSize: 16, color: '#1e1e1e' },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: { fontSize: 16, color: '#1e1e1e' },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e1e1e',
    minHeight: 88,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e1e1e',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelBtnText: { fontSize: 16, color: '#6b7280', fontWeight: '500' },
  uploadBtn: {
    backgroundColor: '#fbae17',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  uploadBtnDisabled: { opacity: 0.7 },
  uploadBtnText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  errorText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 24 },
});
