/**
 * Mobile app header with hamburger menu, search button, and tools menu.
 * Hides on scroll down, shows on scroll up.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text, Animated, PanResponder, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import SvgIcon from './SvgIcon';
import NotificationsPopup from './NotificationsPopup';
import type { IconName } from '../config/icons';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useScrollNav } from '../contexts/ScrollContext';

interface MenuItem {
  label: string;
  svgIcon?: IconName;
  ionicon?: string;
  href?: string;
  section?: string;
  discord?: boolean;
  iconSize?: number;
}

function getToolsItems(t: (key: string) => string): MenuItem[] {
  return [
    { label: t('myDice'), svgIcon: 'MyDice', href: '/my-dice', iconSize: 28 },
    { label: t('gameNightTracker'), svgIcon: 'GameNightTracker', href: '/game-night-tracker', iconSize: 28 },
    { label: t('catanMaps'), svgIcon: 'Catan', href: '/catan-map-generator', iconSize: 28 },
    { label: t('pixelCanvas'), svgIcon: 'PixelCanvas', href: '/pixel-canvas', iconSize: 22 },
    { label: t('boardle'), svgIcon: 'Boardle', href: '/boardle', iconSize: 28 },
    { label: t('diceRoller'), svgIcon: 'DiceRoller', href: '/virtual-tools', iconSize: 28 },
    { label: t('digitalCorner'), svgIcon: 'DigitalCorner', href: '/digital-corner', iconSize: 28 },
  ];
}

const HEADER_HEIGHT = 56;

export default function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { user, isAuthenticated, logout } = useAuth();
  const { navVisible } = useScrollNav();
  const translateY = useRef(new Animated.Value(0)).current;
  const menuItems: MenuItem[] = [
    { section: t('boardGames') },
    { label: t('allGames'), svgIcon: 'AllGames', href: '/all-games' },
    { label: t('hotGames'), svgIcon: 'HotGames', href: '/hot-games' },
    { label: t('topRanked'), svgIcon: 'TopRanked', href: '/top-ranked' },
    { label: t('forums'), svgIcon: 'Forums', href: '/forums' },
    { label: t('gallery'), svgIcon: 'Gallery', href: '/community-gallery' },
    { label: t('shop'), svgIcon: 'Shop', href: '/shop' },
    { label: t('joinDiscord'), ionicon: 'logo-discord', href: 'https://discord.gg/3xh7yUnnnW', discord: true },
  ];
  const toolsItems = getToolsItems(t);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: navVisible ? 0 : -(HEADER_HEIGHT + insets.top),
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [navVisible, insets.top, translateY]);

  const closeMenu = () => setMenuOpen(false);
  const closeTools = () => setToolsOpen(false);

  const menuPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_: unknown, { dy }: { dy: number }) => Math.abs(dy) > 5,
      onPanResponderRelease: (_: unknown, { dy }: { dy: number }) => { if (dy > 60) closeMenu(); },
    })
  ).current;
  const toolsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_: unknown, { dy }: { dy: number }) => Math.abs(dy) > 5,
      onPanResponderRelease: (_: unknown, { dy }: { dy: number }) => { if (dy > 60) closeTools(); },
    })
  ).current;

  const handleNavigation = (href?: string) => {
    setMenuOpen(false);
    setToolsOpen(false);
    if (!href) return;
    if (href.startsWith('http')) {
      Linking.openURL(href);
      return;
    }
    router.push(href as any);
  };

  return (
    <>
      <Animated.View style={[styles.header, { paddingTop: insets.top, transform: [{ translateY }] }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push('/search' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="search" size={24} color="#1e1e1e" />
        </TouchableOpacity>

        <View style={styles.spacer} />

        {/* Create (+) button - only when authenticated */}
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setCreateMenuOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={28} color="#1e1e1e" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.toolsBtn}
          onPress={() => setToolsOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="star" size={18} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setMenuOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="menu" size={24} color="#1e1e1e" />
        </TouchableOpacity>
      </Animated.View>

      {/* Hamburger menu modal */}
      <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <View style={[styles.menuContainer, { maxHeight: Dimensions.get('window').height - insets.top - 16 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{t('menu')}</Text>
              <TouchableOpacity onPress={closeMenu}>
                <Ionicons name="close" size={26} color="#1e1e1e" />
              </TouchableOpacity>
            </View>
            <View style={styles.dragHandle} {...menuPanResponder.panHandlers}>
              <View style={styles.dragHandleBar} />
            </View>
            <ScrollView
              style={[styles.menuContent, { maxHeight: Dimensions.get('window').height - insets.top - 16 - 140 }]}
              contentContainerStyle={styles.menuContentContainer}
              showsVerticalScrollIndicator={true}
            >
              {menuItems.map((item, index) => {
                if (item.section) {
                  return (
                    <View key={`section-${index}`} style={styles.sectionHeader}>
                      <Text style={styles.sectionText}>{item.section}</Text>
                    </View>
                  );
                }
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.menuItem, item.discord && styles.menuItemDiscord]}
                    onPress={() => handleNavigation(item.href)}
                  >
                    {item.svgIcon && (
                      <View style={styles.menuIconWrap}>
                        <SvgIcon name={item.svgIcon} size={24} />
                      </View>
                    )}
                    {item.ionicon && (
                      <View style={styles.menuIconWrap}>
                        <Ionicons name={item.ionicon as any} size={24} color={item.discord ? '#fff' : '#1e1e1e'} />
                      </View>
                    )}
                    <Text style={[styles.menuItemText, item.discord && styles.menuItemTextDiscord]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}

              {isAuthenticated && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionText}>{t('account')}</Text>
                  </View>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation(`/profile/${user?.username}` as any)}>
                    <View style={styles.menuIconWrap}><SvgIcon name="Profile" size={24} /></View>
                    <Text style={styles.menuItemText}>{t('myProfile')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); setNotificationsOpen(true); }}>
                    <View style={styles.menuIconWrap}><SvgIcon name="Notifications" size={24} /></View>
                    <Text style={styles.menuItemText}>{t('notifications')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation(`/collection/${user?.username}` as any)}>
                    <View style={styles.menuIconWrap}><SvgIcon name="MyCollection" size={24} /></View>
                    <Text style={styles.menuItemText}>{t('myCollection')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/settings' as any)}>
                    <View style={styles.menuIconWrap}><SvgIcon name="Settings" size={24} /></View>
                    <Text style={styles.menuItemText}>{t('settings')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <NotificationsPopup visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

      {/* Create (+) menu modal - Upload image / Upload discussion */}
      <Modal visible={createMenuOpen} transparent animationType="fade" onRequestClose={() => setCreateMenuOpen(false)}>
        <TouchableOpacity
          style={styles.createMenuOverlay}
          activeOpacity={1}
          onPress={() => setCreateMenuOpen(false)}
        >
          <View style={styles.createMenuBox} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.createMenuItem}
              onPress={() => { setCreateMenuOpen(false); handleNavigation('/create-post' as any); }}
            >
              <View style={styles.createMenuIconWrap}>
                <SvgIcon name="Gallery" size={22} />
              </View>
              <Text style={styles.createMenuLabel}>{t('uploadImage')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createMenuItem}
              onPress={() => { setCreateMenuOpen(false); handleNavigation('/forums/create-post' as any); }}
            >
              <View style={styles.createMenuIconWrap}>
                <SvgIcon name="Forums" size={22} />
              </View>
              <Text style={styles.createMenuLabel}>{t('uploadDiscussion')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tools menu modal */}
      <Modal visible={toolsOpen} animationType="slide" transparent onRequestClose={closeTools}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeTools}>
          <View style={[styles.menuContainer, { maxHeight: Dimensions.get('window').height - insets.top - 16 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Tools</Text>
              <TouchableOpacity onPress={closeTools}>
                <Ionicons name="close" size={26} color="#1e1e1e" />
              </TouchableOpacity>
            </View>
            <View style={styles.dragHandle} {...toolsPanResponder.panHandlers}>
              <View style={styles.dragHandleBar} />
            </View>
            <ScrollView
              style={[styles.menuContent, { maxHeight: Dimensions.get('window').height - insets.top - 16 - 140 }]}
              contentContainerStyle={styles.menuContentContainer}
              showsVerticalScrollIndicator={true}
            >
              {toolsItems.filter((item) => item.href !== '/my-dice' || isAuthenticated).map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.toolsMenuItem}
                  onPress={() => handleNavigation(item.href)}
                >
                  <View style={styles.toolsIconWrap}>
                    <SvgIcon name={item.svgIcon!} size={item.iconSize || 20} color="#ffffff" />
                  </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 4,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fbae17',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  spacer: {
    flex: 1,
  },
  createMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 12,
  },
  createMenuBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  createMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  createMenuIconWrap: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createMenuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  menuContentContainer: {
    paddingBottom: 24,
  },
  dragHandle: {
    width: '100%',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  menuContent: {
    paddingVertical: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  menuIconWrap: {
    marginRight: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  toolsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fbae17',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  menuItemDiscord: {
    backgroundColor: '#5865F2',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  menuItemTextDiscord: {
    color: '#ffffff',
  },
});
