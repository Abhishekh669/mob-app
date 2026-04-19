import SettingPrivacyRelatedPage from '@/components/settings/setting-privacy-related-page';
import SettingRestaurantInfoPage from '@/components/settings/setting-restaurant-info';
import { useGetRestaurantInformation } from '@/hooks/tanstack/query-hook/setting/use-get-restaurant-info'
import React from 'react'
import { ScrollView } from 'react-native';

function SettingPage() {
  const { data: restaurantInfo, isLoading: infoLoading, isError } = useGetRestaurantInformation();
  const info = restaurantInfo?.info;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f5f4f2' }}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      <SettingRestaurantInfoPage info={info} isLoading={infoLoading} isError={isError} />
      <SettingPrivacyRelatedPage />
    </ScrollView>
  );
}

export default SettingPage