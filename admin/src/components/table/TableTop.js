import Btn from "@/elements/buttons/Btn";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiFilter3Line } from "react-icons/ri";
import { Form, Input, Label } from "reactstrap";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";
import CalenderFilter from "./CalenderFilter";
import MultipleFilter from "./MultipleFilter";
import TableDeleteOption from "./TableDeleteOption";
import TableDuplicateOption from "./TableDuplicateOption";
import TableExportOption from "./TableExportOption";

const TableTop = (props) => {
  const { differentFilter, setPaginate, showFilterDifferentPlace, setSearch, paginate, url, isCheck, setIsCheck, isReplicate, refetch, dateRange, date, setDate, filterHeader, keyInPermission, advanceFilter, exportSelectedUrl, statusCounts, onStatusFilter, activeStatusFilter } = props;
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"], keyInPermission ? keyInPermission : "");
  const { t } = useTranslation("common");
  const [input, setInput] = useState();
  const [showAdvanceFilter, setShowAdvanceFilter] = useState(true);
  const [text, setText] = useState("");
  const [tc, setTc] = useState(null);
  useEffect(() => {
    setInput(paginate);
  }, [paginate]);

  const onChange = (text) => {
    if (tc) clearTimeout(tc);
    setTc(setTimeout(() => setSearch(text), 1000));
  };
  return (
    <>
      <div className="show-box">
        {filterHeader?.noPageDrop !== true && (
          <div className="me-auto">
            <Form
              className="entries-form"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <Label>
                {t("Show")}:
                <select className="form-control" onChange={(e) => setPaginate(e.target.value)}>
                  <option>15</option> <option>25</option> <option>50</option> <option>100</option>
                </select>
              </Label>
              <span>{t("Itemsperpage")}</span>
              {destroy && isCheck?.length > 0 && <TableDeleteOption url={url} setIsCheck={setIsCheck} isCheck={isCheck} />}
              {edit && isCheck?.length > 0 && isReplicate && <TableDuplicateOption isReplicate={isReplicate} url={url} isCheck={isCheck} setIsCheck={setIsCheck} refetch={refetch} />}
              {isCheck?.length > 0 && exportSelectedUrl && <TableExportOption exportUrl={exportSelectedUrl} isCheck={isCheck} />}
            </Form>
            {statusCounts && (
              <div className="product-status">
                <span
                  className={`badge text-body status-filter-btn status-published ${activeStatusFilter === 'published' ? 'active' : ''}`}
                  onClick={() => onStatusFilter && onStatusFilter('published')}
                  style={{ cursor: 'pointer' }}
                >
                  {t("Published")}: <strong className="Published-strong">{statusCounts.published ?? 0}</strong>
                </span>
                <span
                  className={`badge text-body status-filter-btn status-drafts ${activeStatusFilter === 'drafts' ? 'active' : ''}`}
                  onClick={() => onStatusFilter && onStatusFilter('drafts')}
                  style={{ cursor: 'pointer' }}
                >
                  {t("Drafts")}: <strong className="Drafts-strong">{statusCounts.drafts ?? 0}</strong>
                </span>
                <span
                  className={`badge text-body status-filter-btn status-trashed ${activeStatusFilter === 'trashed' ? 'active' : ''}`}
                  onClick={() => onStatusFilter && onStatusFilter('trashed')}
                  style={{ cursor: 'pointer' }}
                >
                  {t("Trashed")}: <strong className="Trashed-strong">{statusCounts.trashed ?? 0}</strong>
                </span>
                {activeStatusFilter && (
                  <span
                    className="badge text-body status-filter-btn"
                    onClick={() => onStatusFilter && onStatusFilter(null)}
                    style={{ cursor: 'pointer', color: '#dc3545' }}
                  >
                    {t("ClearFilter")} ×
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        {dateRange && <CalenderFilter date={date} setDate={setDate} />}
        <div className="d-flex align-items-center gap-2">
          {filterHeader?.noSearch !== true && (
            <div className="role-search">
              <Label htmlFor="role-search" className="form-label">
                {" "}
                {t("Search")}:
              </Label>

              <Input
                type="search"
                className="form-control"
                id="role-search"
                value={text}
                onChange={(e) => {
                  onChange(e.target.value);
                  setText(e.target.value);
                }}
              />
            </div>
          )}
          {advanceFilter && (
            <div className="top-panel-selection">
              <Btn className="align-items-center btn d-flex h-100 btn-light-bg fs-5 px-3 py-1" onClick={() => setShowAdvanceFilter((prev) => !prev)}>
                <RiFilter3Line />
              </Btn>
            </div>
          )}
        </div>
        {showFilterDifferentPlace && filterHeader?.customFilter}
      </div>
      {differentFilter && differentFilter}
      {advanceFilter && showAdvanceFilter ? <MultipleFilter showAdvanceFilter={showAdvanceFilter} advanceFilter={advanceFilter} /> : null}
    </>
  );
};

export default TableTop;
