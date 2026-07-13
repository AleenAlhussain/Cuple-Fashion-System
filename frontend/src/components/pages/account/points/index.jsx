'use client';

import Breadcrumb from '@/utils/commonComponents/breadcrumb';
import WrapperComponent from '@/components/widgets/WrapperComponent';
import AccountSidebar from '../common/AccountSidebar';
import { Col, TabContent, TabPane } from 'reactstrap';
import ResponsiveMenuOpen from '../common/ResponsiveMenuOpen';
import PointTopBar from './PointTopBar';

const AccountPoints = () => {
  return (
    <>
      <Breadcrumb title={'Point'} subNavigation={[{ name: 'Point' }]} />
      <WrapperComponent classes={{ sectionClass: 'dashboard-section section-b-space user-dashboard-section' ,fluidClass:'container'}} customCol={true}>
        <AccountSidebar tabActive={'point'} />
        <Col xxl={9} lg={8}>
          <ResponsiveMenuOpen />
          <div className='faq-content'>
            <TabContent>
              <TabPane className='show active'>
                <PointTopBar />
              </TabPane>
            </TabContent>
          </div>
        </Col>
      </WrapperComponent>
    </>
  );
};

export default AccountPoints;
