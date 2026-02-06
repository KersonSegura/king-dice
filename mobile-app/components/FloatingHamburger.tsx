/**
 * Floating hamburger button (top-right) – overlays content, no header bar.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import SvgIcon from './SvgIcon';
import type { IconName } from '../config/icons';
import { useAuth } from '../contexts/AuthContext';

interface MenuItem {
  label: string;
  svgIcon?: IconName;
  ionicon?: string;
  href?: string;
  section?: string;
  discord?: boolean;
  iconSize?: number;
}

export default function FloatingHamburger() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuth();

  const handleNavigation = (href?: string) => {
    setOpen(false);
    if (!href) return;
    if (href.startsWith('http')) {
      Linking.openURL(href);
      return;
    }
    router.push(href as any);
  };

  const menuItems: MenuItem[] = [
    { label: 'Home', svgIcon: 'Home', href: '/(tabs)' },
    { section: 'Board Games' },
    { label: 'All Games', svgIcon: 'AllGames', href: '/all-games' },
    { label: 'Hot Games', svgIcon: 'HotGames', href: '/hot-games' },
    { label: 'Top Ranked', svgIcon: 'TopRanked', href: '/top-ranked' },
    { label: 'Forums', svgIcon: 'Forums', href: '/forums' },
    { label: 'Gallery', svgIcon: 'Gallery', href: '/community-gallery' },
    { label: 'Shop', svgIcon: 'Shop', href: '/shop' },
    { section: 'Features' },
    ...(isAuthenticated ? [{ label: 'My Dice', svgIcon: 'MyDice', href: '/my-dice' }] : []),
    { label: 'Game Night Tracker', svgIcon: 'GameNightTracker', href: '/game-night-tracker' },
    { label: 'Catan Maps', svgIcon: 'Catan', href: '/catan-map-generator' },
    { label: 'Pixel Canvas', svgIcon: 'PixelCanvas', href: '/pixel-canvas' },
    { label: 'Boardle', svgIcon: 'Boardle', href: '/boardle', iconSize: 28 },
    { label: 'Dice Roller', svgIcon: 'DiceRoller', href: '/dice-roller', iconSize: 28 },
    { label: 'Digital Corner', svgIcon: 'DigitalCorner', href: '/digital-corner' },
    { label: 'Join Discord', ionicon: 'logo-discord', href: 'https://discord.gg/3xh7yUnnnW', discord: true },
  ];

  return (
    <>
      <View
        style={[
          styles.floating,
          { top: insets.top + 8, right: insets.right + 12 },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity onPress={() => setOpen(true)} style={styles.button}>
          <Ionicons name="menu" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={26} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.menuContent}>
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
                        <SvgIcon name={item.svgIcon} size={item.iconSize || 24} />
                      </View>
                    )}
                    {item.ionicon && (
                      <View style={styles.menuIconWrap}>
                        <Ionicons name={item.ionicon as any} size={24} color={item.discord ? '#fff' : '#111827'} />
                      </View>
                    )}
                    <Text style={[styles.menuItemText, item.discord && styles.menuItemTextDiscord]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}

              {isAuthenticated && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionText}>Account</Text>
                  </View>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation(`/profile/${user?.username}` as any)}>
                    <View style={styles.menuIconWrap}><SvgIcon name="Profile" size={24} /></View>
                    <Text style={styles.menuItemText}>My Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation(`/collection/${user?.username}` as any)}>
                    <View style={styles.menuIconWrap}><SvgIcon name="MyCollection" size={24} /></View>
                    <Text style={styles.menuItemText}>My Collection</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/settings' as any)}>
                    <View style={styles.menuIconWrap}><SvgIcon name="Settings" size={24} /></View>
                    <Text style={styles.menuItemText}>Settings</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    zIndex: 9999,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
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
    maxHeight: '80%',
    paddingBottom: 20,
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
