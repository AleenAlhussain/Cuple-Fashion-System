'use client';
import AccountSidebar from '../common/AccountSidebar';
import { Col, TabContent, TabPane } from 'reactstrap';
import DashboardContent from './DashboardContent';
import AddressHeader from '../addresses/AddressHeader';
import ExchangeTable from '../exchange/ExchangeTable';
import NotificationData from '../notification/NotificationData';
import MyOrders from '../orders/MyOrders';
import PointTopBar from '../points/PointTopBar';
import RefundTable from '../refund/RefundTable';
import WalletCard from '../wallet/WalletCard';
import ResponsiveMenuOpen from '../common/ResponsiveMenuOpen';
import Breadcrumbs from '@/utils/commonComponents/breadcrumb';
import WrapperComponent from '@/components/widgets/WrapperComponent';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Tab configuration with titles for breadcrumbs
const tabConfig = {
  dashboard: { title: 'Dashboard', component: DashboardContent },
  notification: { title: 'Notifications', component: NotificationData },
  wallet: { title: 'My Wallet', component: WalletCard },
  point: { title: 'Earning Points', component: PointTopBar },
  order: { title: 'My Orders', component: MyOrders },
  refund: { title: 'Refund History', component: RefundTable },
  exchange: { title: 'Exchange History', component: ExchangeTable },
  address: { title: 'Saved Addresses', component: AddressHeader },
};

const AccountDashboard = ({ initialTab = 'dashboard' }) => {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState({ id: initialTab });

  // Read tab from URL query parameter on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabConfig[tabFromUrl]) {
      setActiveTab({ id: tabFromUrl });
    }
  }, [searchParams]);

  // Update URL when tab changes (without full navigation)
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    // Update URL without navigation for bookmarkability
    const url = new URL(window.location.href);
    if (newTab.id === 'dashboard') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', newTab.id);
    }
    window.history.replaceState({}, '', url.toString());
  };

  const currentTabConfig = tabConfig[activeTab.id] || tabConfig.dashboard;
  const CurrentComponent = currentTabConfig.component;

  return (
    <>
      <Breadcrumbs title={currentTabConfig.title} subNavigation={[{ name: currentTabConfig.title }]} />
      <WrapperComponent classes={{ sectionClass: 'dashboard-section section-b-space user-dashboard-section', fluidClass: 'container' }} customCol={true}>
        <AccountSidebar
          tabActive={activeTab.id}
          controlledActiveTab={activeTab}
          onTabChange={handleTabChange}
          noNavigation={true}
        />
        <Col xxl={9} lg={8}>
          <ResponsiveMenuOpen />
          <div className='dashboard-right-sidebar'>
            <TabContent>
              <TabPane className='show active'>
                <CurrentComponent />
              </TabPane>
            </TabContent>
          </div>
        </Col>
      </WrapperComponent>
    </>
  );
};

export default AccountDashboard;
