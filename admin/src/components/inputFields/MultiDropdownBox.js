import { useEffect, useState } from "react";
import { RiCloseLine } from "react-icons/ri";
import CategoryOptions from "./CategoryOptions";
import { useTranslation } from "react-i18next";
import { Input } from "reactstrap"

const MultiDropdownBox = ({ setIsComponentVisible, data, setFieldValue, values, name, getValuesKey, isComponentVisible }) => {
  const { t } = useTranslation('common');
  const [path, setPath] = useState([]);
  const [showList, setShowList] = useState([]);

  const getNodeChildren = (item) => item?.subcategories || item?.child || [];

  const buildSearchMatches = (items, term, ancestors = []) => {
    if (!Array.isArray(items) || !term) return [];

    const normalizedTerm = term.toLowerCase();
    const matches = [];

    items.forEach((item) => {
      if (!item) return;

      const name = item?.name || item?.title || "";
      const nodeMatches = name.toLowerCase().includes(normalizedTerm);
      const nextAncestors = [...ancestors, item];

      if (nodeMatches) {
        matches.push({
          ...item,
          searchPath: ancestors.map((ancestor) => ancestor?.name || ancestor?.title).filter(Boolean),
        });
      }

      const children = getNodeChildren(item);
      if (children.length) {
        matches.push(...buildSearchMatches(children, term, nextAncestors));
      }
    });

    return matches;
  };

  useEffect(() => {
    if (data) { setShowList(data) }
    if (isComponentVisible == false) { setPath([]) }
  }, [data, isComponentVisible])

  const handleChange = (event) => {
    const keyword = event.target.value;
    if (keyword !== "") {
      setPath([]);
      setShowList(buildSearchMatches(data, keyword));
    } else {
      setShowList(data)
    }
  }
  return (
    <div className={`select-category-box ${isComponentVisible == name && data ? 'show' : ""}`}>
      {data?.length > 5 && <Input placeholder="Search Here ..." className="search-input" onChange={handleChange} />}
      {showList.length > 0 ?
        <>
          <div className="category-content">
            <nav className="category-breadcrumb" aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item" onClick={() => { setPath([]); setShowList(data); }}>
                  <a>{t("All")}</a>
                </li>
                {path.map((item, key) => (
                  <li className={`breadcrumb-item ${key + 1 === path.length ? "active" : ""}`} key={key}>
                    <a
                      onClick={() => {
                        setShowList(item.subcategories ?? item.child);
                        setPath((p) => p.slice(0, key + 1));
                      }}>
                      {item.name || item.title}
                    </a>
                  </li>
                ))}
              </ol>
              <a
                className="close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setPath([]);
                  setIsComponentVisible(false);
                }}>
                <RiCloseLine />
              </a>
            </nav>
            <div className="category-listing">
              <ul>{showList && <CategoryOptions data={data} level={0} showList={showList} setShowList={setShowList} setFieldValue={setFieldValue} path={path} setPath={setPath} setIsComponentVisible={setIsComponentVisible} name={name} values={values} getValuesKey={getValuesKey} />}</ul>
            </div>
          </div>
        </> : "No Data Found"}
    </div>
  );
};

export default MultiDropdownBox;
