import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "reactstrap";

const AttachmentFilter = ({ setSearch, setSorting, search, sorting, typeFilter, setTypeFilter, fromDate, toDate, setFromDate, setToDate }) => {
    
    const { t } = useTranslation( 'common');
    const [tc, setTc] = useState(null);
    const [text, setText] = useState("");
    //  Debouncing function for filtering image by its name
    const onChange = (text) => {
        if (tc) clearTimeout(tc);
        setTc(setTimeout(() => setSearch(text), 1000));
    };
    //  Image Sorting 
    const onSortingChange = (value) => {
        if (tc) clearTimeout(tc);
        setTc(setTimeout(() => setSorting(value), 1000));
    };
    return (
        <div className="select-top-panel">
            <div>
                <Input type="search" className="form-control" value={text || search}
                    placeholder={t("Searchyourfiles")}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setText(e.target.value);
                    }}
                />
            </div>
            <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">{t("Type")}</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WEBP</option>
                <option value="svg">SVG</option>
                <option value="gif">GIF</option>
                <option value="pdf">PDF</option>
                <option value="zip">ZIP</option>
            </select>
            <Input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder={t("FromDate")} />
            <Input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder={t("ToDate")} />
            <select className="form-select" value={sorting} onChange={(e) => onSortingChange(e.target.value)}>
                <option value={""} >{t("SortBydesc")}</option>
                <option value={"newest"}>{t("SortBynewest")}</option>
                <option value={"oldest"}>{t("SortByoldest")}</option>
                <option value={"smallest"}>{t("SortBysmallest")}</option>
                <option value={"largest"}>{t("SortBylargest")}</option>
            </select>
        </div>
    );
};

export default AttachmentFilter;
