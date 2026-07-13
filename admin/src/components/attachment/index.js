import React, { useEffect, useReducer, useState } from "react";
import { Card, CardBody, Col, Container, Row } from "reactstrap";
import { deleteAllImageReducers } from "../../utils/allReducers";
import { attachment } from "../../utils/axiosUtils/API";
import request from "../../utils/axiosUtils";
import Loader from "../commonComponent/Loader";
import TableBottom from "../table/TableBottom";
import AttachmentFilter from "./widgets/AttachmentFilter";
import AttachmentData from "./widgets/AttachmentData";
import AttachmentHead from "./widgets/AttachmentHead";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const AttachmentContain = ({ isAttachment }) => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [paginate, setPaginate] = useState(50);
    const [sorting, setSorting] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [state, dispatch] = useReducer(deleteAllImageReducers, { deleteImage: [] });
    const router = useRouter()     

    const { data: attachmentsData, refetch, isLoading, fetchStatus } = useCustomQuery([attachment], () => request({ url: attachment, params: { search, sort: sorting, paginate: paginate, page, type: typeFilter, from_date: fromDate, to_date: toDate } },router), {
        refetchOnWindowFocus: false, enabled: false, select: (data) => data?.data
    });
    useEffect(() => {
        refetch();
    }, [search, sorting, page, paginate, typeFilter, fromDate, toDate]);
    if (isLoading) return <Loader />
    return (
        <Container fluid={true}>
            <Row>
                <Col sm="12">
                    <Card>
                        <CardBody>
                            <AttachmentHead isAttachment={isAttachment} state={state} dispatch={dispatch} refetch={refetch} attachmentsData={attachmentsData?.data} exportFilters={{ search, sort: sorting, type: typeFilter, from_date: fromDate, to_date: toDate }} />
                            <AttachmentFilter setSearch={setSearch} setSorting={setSorting} search={search} sorting={sorting} typeFilter={typeFilter} setTypeFilter={setTypeFilter} fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} />
                            <div className="content-section select-file-loader select-file-section py-0 ratio2_3">
                                {fetchStatus == 'fetching' && <Loader />}
                                <Row xxl={6} xl={5} md={4} sm={3} xs={2} className="g-sm-3 g-2 media-library-sec ratio_square">
                                    <AttachmentData state={state} dispatch={dispatch} search={search} sorting={sorting} attachmentsData={attachmentsData?.data} refetch={refetch} />
                                </Row>
                            </div>
                        </CardBody>
                        {attachmentsData?.data.length > 0 && <TableBottom
                            current_page={attachmentsData?.current_page}
                            total={attachmentsData?.total}
                            per_page={attachmentsData?.per_page}
                            setPage={setPage}
                        />}
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AttachmentContain;
