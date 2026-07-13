'use client';
import Breadcrumb from '@/utils/commonComponents/breadcrumb';
import WrapperComponent from '@/components/widgets/WrapperComponent';
import AccountSidebar from '../common/AccountSidebar';
import { Col, TabContent, TabPane } from 'reactstrap';
import ResponsiveMenuOpen from '../common/ResponsiveMenuOpen';
import ProfileContent from './ProfileContent';

const AccountProfile = () => {
  return (
    <>
      <Breadcrumb title={'UserProfile'} subNavigation={[{ name: 'UserProfile' }]} />
      <WrapperComponent classes={{ sectionClass: 'user-dashboard-section section-b-space' }} customCol={true}>
        <AccountSidebar tabActive={'profile'} />
        <Col xxl={9} lg={8}>
          <ResponsiveMenuOpen />
          <div className='dashboard-right-sidebar'>
            <TabContent>
              <TabPane className='show active'>
                <ProfileContent />
              </TabPane>
            </TabContent>
          </div>
        </Col>
      </WrapperComponent>
    </>
  );
};

export default AccountProfile;
