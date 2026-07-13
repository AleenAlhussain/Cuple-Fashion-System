import TabTitle from '@/components/widgets/TabTitle';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Card, Col, Row } from 'reactstrap';
import { ThemeOptionTabTitleListData } from '../../data/TabTitleList';
import Btn from '../../elements/buttons/Btn';
import request from '../../utils/axiosUtils';
import { ThemeOptions } from '../../utils/axiosUtils/API';
import { RecursiveSet } from '../../utils/customFunctions/RecursiveSet';
import usePermissionCheck from '../../utils/hooks/usePermissionCheck';
import Loader from '../commonComponent/Loader';
import ThemeOptionAllTabs from './ThemeOptionAllTabs';
import { ThemeOptionInitialValue } from './ThemeOptionInitialValue';
import ThemeOptionSubmit from './ThemeOptionSubmit';
import { useTranslation } from "react-i18next";
import useCustomQuery from '@/utils/hooks/useCustomQuery';
import { checkPermission } from "../common/CheckPermissionList";

const ThemeOptionForm = ({ mutate, loading, title }) => {

    const { t } = useTranslation( 'common');
    const [activeTab, setActiveTab] = useState("1");
    const [edit] = usePermissionCheck(["edit"]);
    const hasThemePermission = useMemo(() => checkPermission("theme_option.index"), []);
    const router = useRouter();
    const { data, isLoading, refetch } = useCustomQuery([ThemeOptions], () => request({ url: ThemeOptions },router), { refetchOnWindowFocus: false, enabled: hasThemePermission, select: (res) => res?.data?.data || res?.data });
    let NewSettingsData = data?.options || data || {};

    let IncludeList = ['status', "cookie_enable", "back_to_top_enable", 'footer_copyright', 'payment_enable', 'social_media_enable', "sticky_header_enable", "page_top_bar_enable", "back_button_enable", "page_top_bar_dark", "sticky_cart_enable", "celebration_effect", "exit_tagline_enable"]
    RecursiveSet({ data: NewSettingsData, IncludeList })
    if (!hasThemePermission) {
        return (
            <Col>
                <Card>
                    <div className="title-header option-title">
                        <h5>{t(title)}</h5>
                    </div>
                    <div className="p-4 text-center">
                        <div className="fw-semibold text-danger fs-4 mb-2">
                            Permission Required
                        </div>
                        <div className="text-muted small fs-6">
                            This section is available to administrators only.
                        </div>
                    </div>
                </Card>
            </Col>
        );
    }
    if (isLoading) return <Loader />
    return (
        <Formik
            enableReinitialize
            initialValues={{ ...ThemeOptionInitialValue(NewSettingsData) }}
            onSubmit={(values) => {
                ThemeOptionSubmit(values, mutate)
            }}>
            {({ values, errors, touched, setFieldValue }) => (
                <Form className="theme-form theme-form-2 mega-form vertical-tabs">
                    <Col>
                        <Card>
                            <div className="title-header option-title">
                                <h5>{t(title)}</h5>
                            </div>
                            <Row>
                                <Col xl="3" lg="4">
                                    <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={ThemeOptionTabTitleListData} errors={errors} touched={touched} />
                                </Col>
                                <ThemeOptionAllTabs activeTab={activeTab} errors={errors} values={values} setFieldValue={setFieldValue} touched={touched} />
                                <div className="ms-auto justify-content-end dflex-wgap mt-4 save-back-button">
                                    <Btn className="me-2 btn-outline btn-lg" title="Back" onClick={() => router.back()} />
                                    {edit && <Btn className="btn-primary btn-lg" type="submit" title="Save" loading={Number(loading)} />}
                                </div>
                            </Row>
                        </Card>
                    </Col>
                </Form>
            )}
        </Formik>
    )
}
export default ThemeOptionForm
