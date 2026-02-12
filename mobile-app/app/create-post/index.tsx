/**
 * Create post - Step 1: Select or take a photo (Instagram-like)
 * Camera button + Recent photos grid, preview, Next
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../../contexts/LocaleContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';

const GRID_GAP = 2;

/** On iOS, the picker can return ph:// (Photo Library) URIs that fetch/upload cannot read. Convert to file://. */
async function toUploadableUri(uri: string): Promise<string> {
  if (!uri.startsWith('ph://')) return uri;
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch (e) {
    console.warn('Failed to resolve ph:// URI', e);
    return uri;
  }
}
const COLS = 4;

export default function CreatePostSelectPhoto() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { width } = useWindowDimensions();
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [recentAssets, setRecentAssets] = useState<MediaLibrary.Asset[]>([]);
  const [thumbnailUris, setThumbnailUris] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const cellSize = (width - GRID_GAP * (COLS + 1)) / COLS;

  useEffect(() => {
    (async () => {
      const camStatus = await ImagePicker.requestCameraPermissionsAsync();
      // Only require camera for the screen; media library is optional (for Recent grid)
      setPermissionGranted(camStatus.status === 'granted');

      let libStatus: string | null = null;
      try {
        const result = await MediaLibrary.requestPermissionsAsync();
        libStatus = result.status;
      } catch (e) {
        // Expo Go may reject if AUDIO permission not in manifest; we only need photos - skip Recent grid
        setLoading(false);
        return;
      }
      if (libStatus !== 'granted') {
        setLoading(false);
        return;
      }
      try {
        const { assets } = await MediaLibrary.getAssetsAsync({
          first: 32,
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });
        setRecentAssets(assets);
        // Resolve localUri for each asset so thumbnails can display (asset.uri can be ph:// on iOS)
        const results = await Promise.all(
          assets.map(async (a) => {
            try {
              const info = await MediaLibrary.getAssetInfoAsync(a);
              return { id: a.id, uri: info.localUri || a.uri };
            } catch {
              return { id: a.id, uri: a.uri };
            }
          })
        );
        const map: Record<string, string> = {};
        results.forEach((r) => {
          if (r.uri) map[r.id] = r.uri;
        });
        setThumbnailUris(map);
      } catch (e) {
        console.warn('Recent photos load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionNeeded'), t('cameraRequiredMessage'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = await toUploadableUri(result.assets[0].uri);
      setSelectedUri(uri);
    }
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = await toUploadableUri(result.assets[0].uri);
      setSelectedUri(uri);
    }
  };

  const onSelectAsset = async (asset: MediaLibrary.Asset) => {
    const info = await MediaLibrary.getAssetInfoAsync(asset);
    if (info.localUri) {
      const uri = await toUploadableUri(info.localUri);
      setSelectedUri(uri);
    }
  };

  const goNext = () => {
    if (!selectedUri) return;
    router.push({ pathname: '/create-post/details', params: { imageUri: selectedUri } });
  };

  if (permissionGranted === false) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('newPost')}</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.permText}>{t('createPostPermissionMessage')}</Text>
          <Text style={styles.permSubtext}>{t('createPostPermissionSubtext')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('newPost')}</Text>
        <TouchableOpacity
          onPress={goNext}
          disabled={!selectedUri}
          style={[styles.headerBtn, styles.nextBtn]}
        >
          <Text style={[styles.nextText, !selectedUri && styles.nextDisabled]}>{t('next')}</Text>
        </TouchableOpacity>
      </View>

      {/* Preview */}
      <View style={styles.previewWrap}>
        {selectedUri ? (
          <Image source={{ uri: selectedUri }} style={styles.previewImage} resizeMode="contain" />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Ionicons name="image-outline" size={64} color="#9ca3af" />
            <Text style={styles.previewPlaceholderText}>{t('selectOrTakePhoto')}</Text>
          </View>
        )}
      </View>

      {/* Recent label + Select */}
      <View style={styles.recentBar}>
        <Text style={styles.recentLabel}>{t('recent')}</Text>
        <TouchableOpacity onPress={pickFromLibrary}>
          <Text style={styles.selectBtn}>{t('selectFromLibrary')}</Text>
        </TouchableOpacity>
      </View>

      {/* Grid: camera + recent thumbnails */}
      <ScrollView style={styles.gridScroll} contentContainerStyle={styles.gridContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#fbae17" style={styles.gridLoader} />
        ) : (
          <View style={styles.grid}>
            <TouchableOpacity
              style={[styles.gridCell, styles.cameraCell, { width: cellSize, height: cellSize }]}
              onPress={openCamera}
            >
              <Ionicons name="camera" size={36} color="#374151" />
            </TouchableOpacity>
            {recentAssets.map((asset) => (
              <TouchableOpacity
                key={asset.id}
                style={[styles.gridCell, { width: cellSize, height: cellSize }]}
                onPress={() => onSelectAsset(asset)}
              >
                <Image
                  source={{ uri: thumbnailUris[asset.id] || asset.uri }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  nextBtn: { width: 'auto', minWidth: 60 },
  nextText: { fontSize: 16, fontWeight: '600', color: '#3797f0' },
  nextDisabled: { color: '#666' },
  previewWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: { width: '100%', height: '100%' },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: { color: '#9ca3af', marginTop: 8, fontSize: 14 },
  recentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  recentLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  selectBtn: { fontSize: 16, color: '#3797f0', fontWeight: '600' },
  gridScroll: { flex: 1, backgroundColor: '#000' },
  gridContent: { padding: GRID_GAP, paddingBottom: 40 },
  gridLoader: { padding: 40 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCell: {
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  cameraCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { width: '100%', height: '100%' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  permSubtext: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
});
