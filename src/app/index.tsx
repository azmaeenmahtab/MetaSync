/**
 * index.tsx — Home Screen
 *
 * This is the first screen the user sees when the app opens.
 * It simply renders LeadsListScreen, which handles all the
 * real-time lead display logic via the useLeads hook.
 */

import { LeadsListScreen } from '@/features/leads/components/LeadsListScreen';

export default function HomeScreen() {
  return <LeadsListScreen />;
}
