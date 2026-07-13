import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Options from "../../table/Options";
import { RiArrowDownSLine } from "react-icons/ri";

const TreeLine = ({
  data,
  level,
  active,
  setActive,
  type,
  mutate,
  loading,
  registerContainer = () => {},
  reorderingId,
  parentId = null,
}) => {
  const router = useRouter();

  if (!data) return null;

  return (
    <ul ref={registerContainer} data-parent-id={parentId}>
      {data.map((item, i) => {
        const hasSubcategories = item.subcategories && item.subcategories.length > 0;

        return (
          <li
            key={i}
            data-item-id={item.id}
            className={hasSubcategories ? "inside-ul" : ""}
            style={{
              color: router?.query?.updateId == item.id ? "#0da487" : "",
              opacity: reorderingId === item.id ? 0.5 : 1,
            }}
          >
            <div
              className={`${item.status == 0 ? "disabled" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (hasSubcategories) {
                  let temp = active;
                  active.includes(item.id) ? temp.splice(active.indexOf(item.id), 1) : (temp = [...active, item.id]);
                  setActive([...temp]);
                }
              }}
            >
              {hasSubcategories && <RiArrowDownSLine />}
              {item.name}
              {typeof item?.products_count !== "undefined" && (
                <span className="ms-2 badge bg-light text-dark">{item.products_count}</span>
              )}
              <div className="tree-options">
                <Options fullObj={item} mutate={mutate} type={type} loading={loading} moduleName="category" keyInPermission={"category"} />
              </div>
            </div>
            {hasSubcategories && (
              <div className={active.includes(item.id) ? "d-block" : "d-none"}>
                <TreeLine
                  data={item.subcategories}
                  level={level + 1}
                  active={active}
                  setActive={setActive}
                  mutate={mutate}
                  type={type}
                  registerContainer={registerContainer}
                  reorderingId={reorderingId}
                  parentId={item.id}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default TreeLine;
