import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

/**
 * Tab order is Dashboard | Start | Profile. Start is the `index` route, which makes it
 * the tab selected when the app opens.
 */
export default function TabLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      tintColor={theme.tint}
      backgroundColor={theme.background}
      indicatorColor={theme.tintSoft}
      labelStyle={{ selected: { color: theme.tint } }}>
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="insights" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Start</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.flexibility" md="self_improvement" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
