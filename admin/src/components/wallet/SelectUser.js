import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, Col } from 'reactstrap';
import request from '../../utils/axiosUtils';
import { user } from '../../utils/axiosUtils/API';
import SearchableSelectInput from '../inputFields/SearchableSelectInput';
import useCustomQuery from '@/utils/hooks/useCustomQuery';

const SelectUser = ({ values, title, role, name, userRole, onUserDataChange }) => {
    const [search, setSearch] = useState(false);
    const [customSearch, setCustomSearch] = useState("")
    const [tc, setTc] = useState(null);
    const requestRole = role === "consumer" ? "customer" : role;

    const { data, isLoading, refetch } = useCustomQuery(
        [user, requestRole, customSearch],
        () =>
            request({
                url: user,
                params: {
                    role: requestRole,
                    status: 1,
                    paginate: 15,
                    search: role !== 'vendor' ? (customSearch ? customSearch : "") : "",
                },
            }),
        {
            enabled: false,
            refetchOnWindowFocus: false,
            select: (data) =>
                data?.data?.data?.map((el) => {
                    return {
                        id: el.id,
                        name: el.name,
                        point_balance: Number(el?.point?.balance ?? 0),
                        wallet_balance: Number(el?.wallet?.balance ?? 0),
                    };
                }),
        }
    );

    const selectedUser = useMemo(
        () => (data || []).find((item) => Number(item?.id) === Number(values?.[name])),
        [data, name, values]
    );

    useEffect(() => {
        userRole !== 'vendor' && refetch();
    }, [])

    useEffect(() => {
        if (tc) clearTimeout(tc);
        setTc(setTimeout(() => setCustomSearch(search), 500));
    }, [search])

    useEffect(() => {
        role !== 'vendor' && refetch()
    }, [customSearch])

    useEffect(() => {
        if (!onUserDataChange) return;

        if (!values?.[name]) {
            onUserDataChange(null);
            return;
        }

        if (selectedUser) {
            onUserDataChange(selectedUser);
        }
    }, [name, selectedUser, values?.[name]])

    return (
        <Col xxl="4" xl="5">
            <Card>
                <CardBody className='theme-form'>
                    <div className="title-header option-title">
                        <div className="d-flex align-items-center">
                            <h5>{title}</h5>
                        </div>
                    </div>
                    <SearchableSelectInput
                        nameList={[
                            {
                                name: name,
                                title: "User",
                                notitle: 'true',
                                inputprops: {
                                    initialTittle:'Select Customer',
                                    name: name,
                                    id: name,
                                    options: data || [],
                                    defaultOption: "Select User",
                                    setsearch: setSearch,
                                },
                            },
                        ]}
                    />
                </CardBody>
            </Card>
        </Col>
    )
}

export default SelectUser
