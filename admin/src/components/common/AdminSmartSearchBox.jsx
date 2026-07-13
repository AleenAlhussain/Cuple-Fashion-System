import { useEffect, useRef } from "react";
import { Input } from "reactstrap";
import { RiSearchLine } from "react-icons/ri";

const AdminSmartSearchBox = ({
  value,
  onChange,
  onApply,
  debounceMs = 400,
  placeholder,
  inputId,
  loading = false,
}) => {
  const debounceRef = useRef(null);

  const applyNow = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onApply && onApply((value || "").trim());
  };

  useEffect(() => {
    if (!onApply) return undefined;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onApply((value || "").trim());
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, debounceMs, onApply]);

  return (
    <div className="admin-smart-search d-flex align-items-center gap-2">
      <div className="admin-smart-search-input position-relative flex-grow-1">
        <RiSearchLine className="admin-smart-search-icon" />
        <Input
          type="search"
          className="form-control admin-smart-search-field"
          id={inputId}
          value={value || ""}
          placeholder={placeholder || "Search"}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyNow();
            }
          }}
        />
        {loading ? (
          <span className="spinner-border spinner-border-sm admin-smart-search-spinner" role="status" />
        ) : null}
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={applyNow}>
        Filter
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={() => {
          onChange && onChange("");
          onApply && onApply("");
        }}
      >
        Clear
      </button>
    </div>
  );
};

export default AdminSmartSearchBox;
