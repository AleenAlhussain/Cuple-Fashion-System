import { ReactstrapRadio } from "@/components/widgets/reactstrapFormik";
import { Field } from "formik";
import { useTranslation } from "react-i18next";
import { Col, Label } from "reactstrap";
import { RiDeleteBinLine } from "react-icons/ri";

const ShowAddress = ({ item, type, index, onDelete }) => {
  const { t } = useTranslation("common");

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(item.id);
    }
  };

  return (
    <Col xxl={6} lg={12} md={6}>
      <Label className="m-0 h-100" htmlFor={`address-${type}-${index}`}>
        <div className="delivery-address-box position-relative">
          {onDelete && (
            <button
              type="button"
              className="btn btn-sm position-absolute"
              style={{ top: "8px", right: "8px", padding: "4px 8px", color: "#dc3545", background: "transparent", border: "none" }}
              onClick={handleDelete}
              title={t("Remove")}
            >
              <RiDeleteBinLine size={18} />
            </button>
          )}
          <div>
            <div className="form-check">
              <Field component={ReactstrapRadio} id={`address-${type}-${index}`} className="form-check-input" type="radio" name={`${type}_address_id`} value={item.id} />
            </div>
            <ul className="delivery-address-detail">
              <li>
                <h4 className="fw-semibold">{item?.title}</h4>
              </li>
              <li>
                <p className="text-content">
                  <span className="text-title">{t("Address")} : </span>
                  {item?.street}, {item?.city}, {item?.state_object?.name || item?.state}, {item?.country?.name}
                </p>
              </li>
              <li>
                <h6 className="text-content">
                  <span className="text-title">{t("PinCode")} :</span> {item?.pincode || item?.postal_code}
                </h6>
              </li>
              <li>
                <h6 className="text-content mb-0">
                  <span className="text-title">{t("Phone")} :</span> {item?.country_code && `+${item?.country_code}`} {item?.phone}
                </h6>
              </li>
            </ul>
          </div>
        </div>
      </Label>
    </Col>
  );
};

export default ShowAddress;
