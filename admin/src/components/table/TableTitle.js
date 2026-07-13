import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FiPlus } from "react-icons/fi";
import Btn from "../../elements/buttons/Btn";
import Pluralize from "../../utils/customFunctions/Pluralize";
import NoSsr from "../../utils/hoc/NoSsr";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";
import ImportExport from "./ImportExport";
import BulkProductImport from "../product/BulkProductImport";
import React from "react";

const TableTitle = ({
  fullObj,
  moduleName,
  onlyTitle,
  type,
  filterHeader,
  importExport,
  refetch,
  exportButton,
  showFilterDifferentPlace,
  selectedIds,
  exportParams,
}) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const pathname = usePathname();
  const [create] = usePermissionCheck(["create"]);
 const isCategoryModule = moduleName?.toLowerCase?.() === "category";

  return (
    <div className="title-header option-title">

      {/* =============== HEADER ROW =============== */}
      <div className="d-flex align-items-center justify-content-between w-100">

        {/* LEFT: Title */}
        <h5 className="mb-0">
          {filterHeader?.customTitle
            ? t(filterHeader?.customTitle)
            : t(Pluralize(moduleName))}
        </h5>

        {/* RIGHT: Custom Right Element (Add New Rule) */}
        {filterHeader?.customTitleRight ? (
          <div className="ms-2">{filterHeader.customTitleRight}</div>
        ) : null}
      </div>
      {/* =============== END HEADER ROW =============== */}

      {/* IMPORT/EXPORT BUTTONS */}
      {importExport && moduleName?.toLowerCase() === "product" ? (
        <BulkProductImport refetch={refetch} />
      ) : importExport ? (
        <ImportExport
          importExport={importExport}
          moduleName={Pluralize(moduleName)}
          refetch={refetch}
          exportButton={exportButton}
          selectedIds={selectedIds}
          exportParams={exportParams}
        />
      ) : null}

      <NoSsr>
        {/* Custom filter area */}
        {filterHeader?.customFilter &&
          !showFilterDifferentPlace &&
          filterHeader?.customFilter}

        {/* DEFAULT Add button (if needed by system) */}
{create &&
  !onlyTitle &&
  !filterHeader?.customTitleRight &&
  !isCategoryModule && (   // 👈 لا تُظهر الزر إذا كان Category
    <Btn
      className="align-items-center btn-theme add-button"
      title={t("Add") + " " + t(moduleName)}
      onClick={() =>
        type == "post" && moduleName.toLowerCase() == "tag"
          ? router.push(`/${pathname.split("/")[1]}/tag/create`)
          : type == "post"
          ? router.push(`/${pathname.split("/")[1]}/category/create`)
          : router.push(`/${pathname.split("/")[1]}/create`)
      }
    >
      <FiPlus />
    </Btn>
  )}

      </NoSsr>
    </div>
  );
};

export default TableTitle;
