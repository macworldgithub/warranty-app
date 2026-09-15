import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map(tab => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.75}
              onPress={() => onTabChange(tab.key)}
              style={[
                styles.tab,
                isActive ? styles.tabActive : styles.tabInactive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined && (
                <View
                  style={[
                    styles.countBadge,
                    isActive ? styles.countBadgeActive : styles.countBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      isActive ? styles.countTextActive : styles.countTextInactive,
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1,
  },
  tabActive: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.primary,
  },
  tabInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabTextInactive: {
    color: colors.textSecondary,
  },
  countBadge: {
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: spacing.borderRadius.full,
  },
  countBadgeActive: {
    backgroundColor: colors.primary,
  },
  countBadgeInactive: {
    backgroundColor: colors.backgroundSecondary,
  },
  countText: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
  },
  countTextActive: {
    color: colors.textInverse,
  },
  countTextInactive: {
    color: colors.textSecondary,
  },
});
