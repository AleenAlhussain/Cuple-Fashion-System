import { Form, Formik } from "formik";
import { useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiUploadCloud2Line } from "react-icons/ri";
import { Row, TabContent, TabPane } from "reactstrap";
import ShowModal from "../../../../elements/alerts&Modals/Modal";
import Btn from "../../../../elements/buttons/Btn";
import { selectImageReducer } from "../../../../utils/allReducers";
import request from "../../../../utils/axiosUtils";
import { attachment, createAttachment } from "../../../../utils/axiosUtils/API";
import useCreate from "../../../../utils/hooks/useCreate";
import usePermissionCheck from "../../../../utils/hooks/usePermissionCheck";
import { YupObject, requiredSchema } from "../../../../utils/validation/ValidationSchemas";
import FileUploadBrowser from "../../../inputFields/FileUploadBrowser";
import TableBottom from "../../../table/TableBottom";
import AttachmentFilter from "../AttachmentFilter";
import ModalButton from "./ModalButton";
import ModalData from "./ModalData";
import ModalNav from "./ModalNav";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import Loader from "@/components/commonComponent/Loader";

const AttachmentModal = (props) => {
    const { modal, setModal, setFieldValue, name, setSelectedImage, isAttachment, multiple, values, showImage, redirectToTabs, noAPICall ,selectedImage ,paramsProps, onUploadComplete } = props
    const [create] = usePermissionCheck(["create"], "attachment");    
    const { t } = useTranslation( 'common');
    const [tabNav, setTabNav] = useState(1);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [paginate, setPaginate] = useState(50);
    const [sorting, setSorting] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const router = useRouter()
    const [state, dispatch] = useReducer(selectImageReducer, { selectedImage: [], isModalOpen: "", setBrowserImage: '' });
    const paramsSignature = JSON.stringify(paramsProps ?? {});
    const modalQueryEnabled = modal && !noAPICall && tabNav === 1;
    const { data: attachmentsData, refetch, isLoading: isQueryLoading, fetchStatus } = useCustomQuery(
        [attachment, "modal", search, sorting, paginate, page, typeFilter, fromDate, toDate, paramsSignature],
        () => request({
            url: attachment,
            params: {
                search,
                sort: sorting,
                paginate,
                page,
                type: typeFilter,
                from_date: fromDate,
                to_date: toDate,
                ...paramsProps,
            }
        }, router),
        {
            enabled: modalQueryEnabled,
            refetchOnWindowFocus: false,
            select: (data) => data?.data
        }
    );
    const { mutate, isLoading: isUploadLoading } = useCreate(createAttachment, false, !redirectToTabs && "/attachment", redirectToTabs ? "No" : false, () => {
        refetch();
        !redirectToTabs && setModal(false)
        redirectToTabs && setTabNav(1)
    });
    useEffect(() => {
        if (!modal) return;

        if (isAttachment) {
            setTabNav(2);
            return;
        }

        setTabNav(1);
    }, [modal, isAttachment]);
    useEffect(() => {
        dispatch({ type: "SELECTEDIMAGE", payload: selectedImage})
    }, [modal, selectedImage]);

    return (
        <ShowModal open={modal} setModal={setModal} modalAttr={{ className: "media-modal modal-dialog modal-dialog-centered modal-xl" }} close={true} title={"InsertMedia"} noClass={true}
            buttons={tabNav === 1 && <ModalButton setModal={setModal} dispatch={dispatch} state={state} name={name} setSelectedImage={setSelectedImage} attachmentsData={attachmentsData?.data} setFieldValue={setFieldValue} tabNav={tabNav} multiple={multiple} mutate={mutate} isLoading={isUploadLoading} values={values} showImage={showImage} />}>
            <ModalNav tabNav={tabNav} setTabNav={setTabNav} isAttachment={isAttachment} />
            <TabContent activeTab={tabNav}>
                {!isAttachment && <TabPane className={tabNav == 1 ? "fade active show" : ""} id="upload">
                    <AttachmentFilter
                        setSearch={setSearch}
                        setSorting={setSorting}
                        search={search}
                        sorting={sorting}
                        typeFilter={typeFilter}
                        setTypeFilter={setTypeFilter}
                        fromDate={fromDate}
                        toDate={toDate}
                        setFromDate={setFromDate}
                        setToDate={setToDate}
                    />
                    {<div className="content-section select-file-section py-0 ratio2_3">
                        {(isQueryLoading || fetchStatus === "fetching") && <Loader />}
                        {<Row xxl={6} xl={5} lg={4} sm={3} xs={2} className="g-sm-3 g-2 py-0 media-library-sec ratio_square">
                            <ModalData
                                isModal={true}
                                attachmentsData={attachmentsData?.data}
                                state={state}
                                refetch={refetch}
                                dispatch={dispatch}
                                multiple={multiple}
                                redirectToTabs={redirectToTabs}
                                isLoading={isQueryLoading || fetchStatus === "fetching"}
                            />
                        </Row>}
                        { attachmentsData?.data?.length > 0 && <TableBottom current_page={attachmentsData?.current_page} total={attachmentsData?.total} per_page={attachmentsData?.per_page} setPage={setPage} />}
                    </div>}
                </TabPane>}
                {create && <TabPane className={tabNav == 2 ? "fade active show" : ""} id="select">
                    {<div className="content-section drop-files-sec">
                        <div>
                            <RiUploadCloud2Line />
                            <Formik
                                initialValues={{ attachments: "" }}
                                validationSchema={YupObject({ attachments: requiredSchema })}
                                onSubmit={async (values, { resetForm }) => {
                                    // Upload each file
                                    const files = Object.values(values.attachments);
                                    for (const file of files) {
                                        let formData = new FormData();
                                        formData.append('file', file);
                                        await request({
                                            url: createAttachment,
                                            method: 'POST',
                                            data: formData,
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        }, router);
                                    }
                                    setSearch("");
                                    setPage(1);
                                    setSorting("");
                                    setTypeFilter("");
                                    setFromDate("");
                                    setToDate("");
                                    onUploadComplete && onUploadComplete();
                                    resetForm();
                                    !redirectToTabs && setModal(false);
                                    redirectToTabs && setTabNav(1);
                                }}>
                                {({ values, setFieldValue, errors }) => (
                                    <Form className="theme-form theme-form-2 mega-form">
                                        <div>
                                            <div className="dflex-wgap justify-content-center ms-auto save-back-button">
                                                <h2>{t("Dropfilesherepaste")} <span>{t("or")}</span>
                                                    <FileUploadBrowser errors={errors} id="attachments" name="attachments" type="file" multiple={true} values={values} setFieldValue={setFieldValue} dispatch={dispatch} accept="*/*" />
                                                </h2>
                                            </div>
                                        </div>
                                        <div className="modal-footer">
                                            {values?.attachments?.length > 0 &&
                                                <a href="#javascript" onClick={() => setFieldValue('attachments', "")}>{t("Clear")}</a>
                                            }
                                            <Btn type="submit" className="ms-auto" title="Insert Media" loading={Number(isUploadLoading)} />
                                        </div>
                                    </Form>
                                )}
                            </Formik>
                        </div>
                    </div>}
                </TabPane>}
            </TabContent>
        </ShowModal>
    );
};
export default AttachmentModal;
