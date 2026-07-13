import { Col, TabContent, TabPane } from 'reactstrap'
import GeneralTab from './GeneralTab'
import HomePageBannerTab from './HomePageBannerTab'
import HeaderTab from './HeaderTab'
import FooterTab from './FooterTab'
import ProductLayout from './ProductLayout'
import ContactPageTab from './ContactPageTab'
import ErrorPage from './ErrorPage'
import SeoTab from './SeoTab'
import { Category } from '../../utils/axiosUtils/API'
import request from '../../utils/axiosUtils'
import Loader from '../commonComponent/Loader'
import AboutUsTab from './aboutUs'
import PopupTab from './popup'
import { useRouter } from 'next/navigation'
import useCustomQuery from '@/utils/hooks/useCustomQuery'
import CollectionLayoutTab from './collectionLayout'
import HomeCategoriesTab from './HomeCategoriesTab'
import HighlightCardsTab from './HighlightCardsTab'
import HomepageProductsTab from './HomepageProductsTab'
import ShopLayoutTab from './ShopLayoutTab'
import MatchiMatchiTab from './MatchiMatchiTab'

const ThemeOptionAllTabs = ({ activeTab, values, setFieldValue, errors, touched }) => {
    const router = useRouter();
    const { data: categoryData, isLoading } = useCustomQuery([Category], () => request({ url: Category, params: { status: 1 } },router), { refetchOnWindowFocus: false, select: (data) => data.data.data });
    if (isLoading) return <Loader />;
    return (
        <Col xl="7" lg="8">
            <TabContent activeTab={activeTab}>
                <TabPane tabId="1"><GeneralTab values={values} setFieldValue={setFieldValue} errors={errors} /></TabPane>
                <TabPane tabId="2"><HomePageBannerTab values={values} setFieldValue={setFieldValue} /></TabPane>
                <TabPane tabId="3"><HighlightCardsTab values={values} setFieldValue={setFieldValue} /></TabPane>
                <TabPane tabId="4"><HeaderTab values={values} setFieldValue={setFieldValue} categoryData={categoryData} /></TabPane>
                <TabPane tabId="5"><FooterTab values={values} setFieldValue={setFieldValue} errors={errors} categoryData={categoryData} /></TabPane>
                <TabPane tabId="6"><CollectionLayoutTab values={values} setFieldValue={setFieldValue} categoryData={categoryData} /></TabPane>
                <TabPane tabId="7"><ProductLayout values={values} setFieldValue={setFieldValue} errors={errors} /></TabPane>
                <TabPane tabId="8"><HomeCategoriesTab values={values} setFieldValue={setFieldValue} categoryData={categoryData} /></TabPane>
                <TabPane tabId="9"><HomepageProductsTab values={values} setFieldValue={setFieldValue} /></TabPane>
                <TabPane tabId="10"><AboutUsTab values={values} setFieldValue={setFieldValue} /></TabPane>
                <TabPane tabId="11"><ContactPageTab values={values} setFieldValue={setFieldValue} errors={errors} /></TabPane>
                <TabPane tabId="12"><ErrorPage values={values} /></TabPane>
                <TabPane tabId="13"><PopupTab values={values} /></TabPane>
                <TabPane tabId="14"><SeoTab values={values} setFieldValue={setFieldValue} errors={errors} /></TabPane>
                <TabPane tabId="15"><ShopLayoutTab /></TabPane>
                <TabPane tabId="16"><MatchiMatchiTab values={values} setFieldValue={setFieldValue} /></TabPane>
            </TabContent>
        </Col>
    )
}

export default ThemeOptionAllTabs
