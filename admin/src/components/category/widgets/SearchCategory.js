import { useEffect, useRef, useState } from "react";
import { Input } from "reactstrap";
import NoDataFound from "../../commonComponent/NoDataFound";
import TreeLine from "./TreeLine";
import { useTranslation } from "react-i18next";
import NoCategoryImage from "../../../../public/assets/svg/no-category.png";

const SearchCategory = ({ data, setActive, active, setSearch, search, type, mutate, deleteLoading, onReorder, reorderingId }) => {
  const { t } = useTranslation("common");
  const [tc, setTc] = useState(null);
  const containerRefs = useRef([]);
  const drakeRef = useRef(null);

  // Debouncing search input
  const onChange = (text) => {
    if (tc) clearTimeout(tc);
    setTc(setTimeout(() => setSearch(text), 1000));
  };

  const registerContainer = (el) => {
    if (el && !containerRefs.current.includes(el)) {
      containerRefs.current.push(el);
    }
  };

  useEffect(() => {
    if (!onReorder || containerRefs.current.length === 0) return;

    const destroyDragulaInstance = () => {
      const currentDrake = drakeRef.current;
      if (!currentDrake) return;
      if (typeof currentDrake.cancel === "function") {
        currentDrake.cancel(true);
      }
      if (typeof currentDrake.destroy === "function") {
        currentDrake.destroy();
      }
      drakeRef.current = null;
    };

    // Dynamic import to avoid SSR issues with dragula
    let isMounted = true;
    import("react-dragula").then((module) => {
      if (!isMounted) return;
      const dragula = module.default;

      destroyDragulaInstance();

      drakeRef.current = dragula(containerRefs.current, {
        moves: () => true,
        accepts: (el, target) => Boolean(target),
      });

      drakeRef.current.on("drop", (el, target) => {
        const movedId = Number(el.dataset.itemId);
        const parentIdAttr = target?.dataset?.parentId;
        const parentId = parentIdAttr === undefined || parentIdAttr === "null" || parentIdAttr === "" ? null : Number(parentIdAttr);

        const newOrder = Array.from(target.children).map((child, index) => ({
          id: Number(child.dataset.itemId),
          position: index,
        }));

        const movedPosition = newOrder.find((entry) => entry.id === movedId)?.position ?? 0;
        onReorder({
          id: movedId,
          parent_id: parentId,
          position: movedPosition,
          newOrder,
        });
      });
    });

    return () => {
      isMounted = false;
      destroyDragulaInstance();
    };
  }, [onReorder]);

  return (
    <div className="theme-tree-box">
      <Input className="form-control" placeholder={t("SearchNode")} onChange={(e) => onChange(e.target.value)} />
      {data?.length > 0 ? (
        <ul className="tree-main-ul" data-parent-id={null} ref={registerContainer}>
          <li>
            <div>
              <i className="tree-icon folder-icon cursor" role="presentation"></i>
              {t("Category")}
            </div>
            <TreeLine
              data={data}
              level={0}
              setActive={setActive}
              mutate={mutate}
              active={active}
              search={search}
              type={type}
              loading={deleteLoading}
              registerContainer={registerContainer}
              reorderingId={reorderingId}
            />
          </li>
        </ul>
      ) : (
        <NoDataFound customImage={NoCategoryImage} />
      )}
    </div>
  );
};

export default SearchCategory;
