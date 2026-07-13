'use client';
import Breadcrumb from '@/utils/commonComponents/breadcrumb';
import WrapperComponent from '@/components/widgets/WrapperComponent';
import AccountSidebar from '../../common/AccountSidebar';
import { Col, TabContent, TabPane } from 'reactstrap';
import ResponsiveMenuOpen from '../../common/ResponsiveMenuOpen';
import Details from './Details';

const OrderDetailsContain = ({ params }) => {
  return (
    <>
      <Breadcrumb title={'Order'} subNavigation={[{ name: 'Order' }]} />
      <WrapperComponent classes={{ sectionClass: 'dashboard-section section-b-space user-dashboard-section', fluidClass: 'container' }} customCol={true}>
        <AccountSidebar tabActive={'order'} />
        <Col xxl={9} lg={8}>
          <ResponsiveMenuOpen />
          <div className='dashboard-right-sidebar'>
            <TabContent>
              <div className='faq-content'>
              <TabPane className='show active'>
                <Details params={params} />
              </TabPane>
              </div>
            </TabContent>
          </div>
        </Col>
      </WrapperComponent>
    </>
  );
};

export default OrderDetailsContain;
