import React, { forwardRef, useImperativeHandle, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "reactstrap";
import Loader from "../../components/commonComponent/Loader";
import TableBottom from "../../components/table/TableBottom";
import TableTitle from "../../components/table/TableTitle";
import TableTop from "../../components/table/TableTop";
import request from "../axiosUtils";
import useCustomQuery from "../hooks/useCustomQuery";
import useDelete from "../hooks/useDelete";
import useCustomMutation from "../hooks/useCustomMutation";
import SuccessHandle from "../customFunctions/SuccessHandle";
import { useTranslation } from "react-i18next";

const TableWrapper = (WrappedComponent) => {
  const HocComponent = forwardRef(
    (
        {
          url,
          loading,
          moduleName,
        setFieldValue,
        userIdParams,
        type,
        paramsProps,
        searchValue,
        onlyTitle,
        isCheck,
        setIsCheck,
        isReplicate,
        dateRange,
        filterHeader,
        importExport,
        exportSelectedUrl,
        keyInPermission,
        advanceFilter,
        exportButton,
          showFilterDifferentPlace,
          isTrashed,
          differentFilter,
          onQueryParamsChange,
          onTotalChange,
          ...props
        },
      ref
    ) => {
    const router = useRouter();
    const { t } = useTranslation("common");
    const hasValidUrl = Boolean(url && String(url).trim());
    const [paginate, setPaginate] = useState(15);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [internalParams, setInternalParams] = useState(paramsProps || {});
    const [date, setDate] = useState([{ startDate: null, endDate: null, key: "selection" }]);
    const [sortBy, setSortBy] = useState({ field: "", sort: "asc" });
    const [statusFilter, setStatusFilter] = useState(null); // 'published', 'drafts', 'trashed', or null
    const externalParamsSignature = JSON.stringify(paramsProps ?? {});
    const paramsSignature = JSON.stringify(internalParams ?? paramsProps ?? {});

    useEffect(() => {
      if (searchValue !== undefined && searchValue !== search) {
        setSearch(searchValue || "");
      }
    }, [searchValue, search]);

    useEffect(() => {
      if (paramsProps !== undefined) {
        setInternalParams(paramsProps || {});
      }
    }, [externalParamsSignature]);

    // Handle status filter click
    const handleStatusFilter = (filter) => {
      if (statusFilter === filter) {
        setStatusFilter(null); // Toggle off if same filter clicked
      } else {
        setStatusFilter(filter);
      }
      setPage(1); // Reset to first page when filter changes
    };

    // Build status filter params
    const getStatusFilterParams = () => {
      if (!statusFilter) return {};
      switch (statusFilter) {
        case 'published':
          return { status: '1' };
        case 'drafts':
          return { status: '0' };
        case 'trashed':
          return { trashed: '1' };
        default:
          return {};
      }
    };
    const queryParams = {
      paginate,
      page,
      search,
      sort: sortBy?.sort,
      field: sortBy?.field,
      type: type,
      start_date: date[0]?.startDate ?? null,
      end_date: date[0]?.endDate ?? null,
      ...(internalParams || {}),
      ...getStatusFilterParams(),
    };
    const dateRangeKey = `${date[0]?.startDate ?? ""}|${date[0]?.endDate ?? ""}`;
    const trackedParams = useMemo(
      () => ({
        paginate,
        page,
        type,
        statusFilter,
        filters: internalParams || {},
        start_date: date[0]?.startDate ?? null,
        end_date: date[0]?.endDate ?? null,
      }),
      [paginate, page, type, statusFilter, dateRangeKey, internalParams]
    );
    const trackedSignature = JSON.stringify(trackedParams);
    const trackedSignatureRef = useRef(trackedSignature);
    const skipTrackedNotification = useRef(true);

    useEffect(() => {
      if (!onQueryParamsChange) return;
      if (skipTrackedNotification.current) {
        skipTrackedNotification.current = false;
        trackedSignatureRef.current = trackedSignature;
        return;
      }
      if (trackedSignatureRef.current !== trackedSignature) {
        onQueryParamsChange(trackedParams);
        trackedSignatureRef.current = trackedSignature;
      }
    }, [trackedSignature, trackedParams, onQueryParamsChange]);

    const { data, isLoading, refetch, fetchStatus, error } = useCustomQuery(
      [url],
      () => {
        if (!hasValidUrl) {
          return Promise.resolve({
            data: { data: [] },
            status: 204,
            statusText: "No Content",
            headers: {},
            config: {},
          });
        }
        return request(
          {
            url,
            method: "get",
            params: queryParams,
          },
          router
        );
      },
      { enabled: hasValidUrl, refetchOnWindowFocus: false, refetchOnMount: false, cacheTime: 0 }
    );
    const notConfiguredEndpoints = [
      "/wallet/consumer",
      "/wallet/vendor",
      "/points/consumer",
    ];
    const isModuleNotConfigured =
      error?.response?.status === 404 &&
      notConfiguredEndpoints.some((endpoint) =>
        (url || "").toString().includes(endpoint)
      );

    const exportParams = {
      ...(search ? { search } : {}),
      ...(type ? { type } : {}),
      ...(date[0]?.startDate ? { start_date: date[0]?.startDate } : {}),
      ...(date[0]?.endDate ? { end_date: date[0]?.endDate } : {}),
      ...(internalParams || {}),
      ...getStatusFilterParams(),
    };

    const selectedIds = moduleName?.toLowerCase?.() === "user" ? isCheck : [];

    const { statusCounter, ...restProps } = props;
    const statusCounts = statusCounter && data?.data ? statusCounter(data?.data) : undefined;

    // Delete mutation (soft delete - move to trash)
    const { mutate: deleteMutate } = useDelete(url, url, refetch);

    // Get base URL for order operations (remove /trashed suffix if present)
    const baseUrl = url?.replace?.('/trashed', '') || url;

    // Restore mutation (for trashed items)
    const { mutate: restoreMutate } = useCustomMutation(
      (id) => request({ url: `${baseUrl}/${id}/restore`, method: "post" }, router),
      {
        onSuccess: (resData) => {
          SuccessHandle(resData, false, false, t("RestoredSuccessfully") || "Restored successfully");
          refetch && refetch();
        },
      }
    );

    // Force delete mutation (permanent delete for trashed items)
    const { mutate: forceDeleteMutate } = useCustomMutation(
      (id) => request({ url: `${baseUrl}/${id}/force`, method: "delete" }, router),
      {
        onSuccess: (resData) => {
          SuccessHandle(resData, false, false, t("DeletedPermanently") || "Deleted permanently");
          refetch && refetch();
        },
      }
    );

    // To use this function in parent
    useImperativeHandle(ref, () => ({
      call() {
        refetch();
      },
    }));

    useEffect(() => {
      if (loading || !hasValidUrl) return;
      refetch();
    }, [url, hasValidUrl, paginate, page, date, search, loading, sortBy, type, paramsSignature, statusFilter]);

    useEffect(() => {
      const items = data?.data?.data ?? data?.data;
      if (!items || (Array.isArray(items) && items.length === 0)) {
        setIsCheck && setIsCheck([]);
      }
      if (setFieldValue) {
        const responsePayload = data?.data?.data ?? data?.data;
        const balance = responsePayload?.balance;
        setFieldValue("showBalance", balance ?? 0);
      }
    }, [data]);

    useEffect(() => {
      if (onTotalChange) {
        const total = data?.data?.total;
        if (total !== undefined && total !== null) {
          onTotalChange(Number(total));
        }
      }
    }, [data, onTotalChange]);
    if (isLoading) return <Loader />;
    if (isModuleNotConfigured) {
      return (
        <Card>
          <CardBody className="custom-role">
            <div className="p-4 text-center">
              <div className="fw-semibold text-danger fs-5 mb-2">
                Wallet module not configured on backend
              </div>
              <div className="text-muted small fs-6">
                Please contact an administrator to enable wallet/points endpoints.
              </div>
            </div>
          </CardBody>
        </Card>
      );
    }
    return (
      <>
        <Card>
          <CardBody className="custom-role">
            <TableTitle
              moduleName={moduleName}
              type={type}
              onlyTitle={onlyTitle}
              filterHeader={filterHeader}
              importExport={importExport}
              refetch={refetch}
              exportButton={exportButton}
              showFilterDifferentPlace={showFilterDifferentPlace}
              selectedIds={selectedIds}
              exportParams={exportParams}
            />
            {(filterHeader?.noPageDrop !== true || filterHeader?.noSearch !== true) && (
              <TableTop
                setPaginate={setPaginate}
                setSearch={setSearch}
                paginate={paginate}
                isCheck={isCheck}
                setIsCheck={setIsCheck}
                url={url}
                isReplicate={isReplicate}
                refetch={refetch}
                dateRange={dateRange}
                date={date}
                setDate={setDate}
                filterHeader={filterHeader}
                keyInPermission={keyInPermission}
                exportSelectedUrl={exportSelectedUrl}
                statusCounts={statusCounts}
                advanceFilter={advanceFilter}
                showFilterDifferentPlace={showFilterDifferentPlace}
                differentFilter={differentFilter}
                onStatusFilter={handleStatusFilter}
                activeStatusFilter={statusFilter}
              />
            )}
            <div className="table-responsive border-table">
              <WrappedComponent
                data={userIdParams ? data?.data : data?.data?.data ?? data?.data ?? []}
                sortBy={sortBy}
                setSortBy={setSortBy}
                moduleName={moduleName}
                type={type}
                current_page={userIdParams ? data?.data?.transactions?.current_page : data?.data?.current_page}
                per_page={userIdParams ? data?.data?.transactions?.per_page : data?.data?.per_page}
                url={url}
                userIdParams={userIdParams}
                fetchStatus={fetchStatus}
                refetch={refetch}
                isCheck={isCheck}
                setIsCheck={setIsCheck}
                date={date}
                setDate={setDate}
                search={search}
                setSearch={setSearch}
                paramsProps={internalParams}
                setParamsProps={setInternalParams}
                advanceFilter={advanceFilter}
                mutate={deleteMutate}
                restoreMutate={restoreMutate}
                forceDeleteMutate={forceDeleteMutate}
                isTrashed={isTrashed}
                {...restProps}
                keyInPermission={keyInPermission}
              />
            </div>
          </CardBody>
          {filterHeader?.noPagination !== true && <TableBottom current_page={userIdParams ? data?.data?.transactions?.current_page : data?.data?.current_page} total={userIdParams ? data?.data?.transactions?.total : data?.data?.total} per_page={userIdParams ? data?.data?.transactions?.per_page : data?.data?.per_page} setPage={setPage} />}
        </Card>
      </>
    );
  });
  return HocComponent;
};

export default TableWrapper;
