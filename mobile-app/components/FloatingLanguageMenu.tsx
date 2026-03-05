/**
 * Floating language button (top-right) – opens dropdown with English / Español.
 * Same position and button style as FloatingHamburger on the main page.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '../contexts/LocaleContext';

export default function FloatingLanguageMenu() {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale } = useLocale();

  const selectLocale = (next: 'en' | 'es') => {
    setLocale(next);
    setOpen(false);
  };

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
          <Text style={styles.buttonLabel}>{locale === 'es' ? 'ES' : 'EN'}</Text>
          <Ionicons name="chevron-down" size={18} color="#111827" style={styles.chevron} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={[styles.dropdown, { top: insets.top + 8 + 36 + 8 }]}>
            <TouchableOpacity
              style={[styles.dropdownItem, locale === 'en' && styles.dropdownItemActive]}
              onPress={() => selectLocale('en')}
            >
              <Text style={[styles.dropdownItemText, locale === 'en' && styles.dropdownItemTextActive]}>{t('languageEnglish')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownItem, locale === 'es' && styles.dropdownItemActive]}
              onPress={() => selectLocale('es')}
            >
              <Text style={[styles.dropdownItemText, locale === 'es' && styles.dropdownItemTextActive]}>{t('languageSpanish')}</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
  },
  chevron: {
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    right: 12,
    minWidth: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: '#fef3c7',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#b45309',
    fontWeight: '600',
  },
});
