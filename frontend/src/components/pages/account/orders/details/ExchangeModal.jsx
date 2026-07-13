import Avatar from "@/components/widgets/Avatar";
import CustomModal from "@/components/widgets/CustomModal";
import SimpleInputField from "@/components/widgets/inputFields/SimpleInputField";
import { placeHolderImage } from "@/components/widgets/Placeholder";
import { useSettings } from "@/utils/hooks/useSettings";
import Btn from "@/elements/buttons/Btn";
import { YupObject, nameSchema } from "@/utils/validation/ValidationSchema";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { useEffect, useRef, useState } from "react";
import useCreate from "@/utils/hooks/useCreate";
import { useTranslation } from "react-i18next";

const ExchangeModal = ({ modal, setModal, storeData }) => {
  const { t } = useTranslation("common");
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const { mutate: createExchange } = useCreate("/exchange", false, false, t("ExchangeRequestSubmitted") || "Exchange request submitted", () => setModal(false));
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [attachmentItems, setAttachmentItems] = useState([]);

  useEffect(() => {
    if (!modal && attachmentItems.length) {
      attachmentItems.forEach((item) => item?.url && URL.revokeObjectURL(item.url));
      setAttachmentItems([]);
    }
  }, [modal, attachmentItems]);

  const appendFiles = (files, setFieldValue) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const mapped = list.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      isImage: file.type.startsWith("image/"),
    }));
    const next = [...attachmentItems, ...mapped];
    setAttachmentItems(next);
    setFieldValue("attachments", next.map((item) => item.file));
  };

  const removeAttachment = (index, setFieldValue) => {
    const target = attachmentItems[index];
    if (target?.url) {
      URL.revokeObjectURL(target.url);
    }
    const next = attachmentItems.filter((_, i) => i !== index);
    setAttachmentItems(next);
    setFieldValue("attachments", next.map((item) => item.file));
  };

  return (
    <CustomModal
      modal={modal ? true : false}
      setModal={setModal}
      classes={{
        modalClass: "theme-modal-2 exchange-modal",
        modalHeaderClass: "p-0",
        title: "Exchange", 
      }}
    >
      <Formik
        initialValues={{
          reason: "",
          notes: "",
          order_id: storeData?.pivot?.order_id,
          order_item_id: storeData?.pivot?.order_item_id,
          attachments: [],
        }}
        validationSchema={YupObject({
          reason: nameSchema,
          attachments: Yup.array().min(1, t("AttachmentRequired") || "Attachment is required (product photo)."),
        })}
        onSubmit={(values) => {
          const formData = new FormData();
          formData.append("order_id", values.order_id);
          formData.append("order_item_id", values.order_item_id);
          formData.append("reason", values.reason);
          formData.append("notes", values.notes || "");
          Array.from(values.attachments || []).forEach((file) => {
            formData.append("attachments[]", file);
          });
          createExchange(formData);
        }}
      >
        {({ values, setFieldValue, errors, touched }) => (
          <Form className="product-review-form">
            <div className="product-wrapper">
              <div className="product-image">
                <Avatar
                  data={
                    storeData?.product_thumbnail
                      ? storeData?.product_thumbnail
                      : placeHolderImage
                  }
                  customImageClass="img-fluid"
                  name={storeData?.name}
                />
              </div>
              <div className="product-content">
                <h5 className="name">{storeData?.name}</h5>
                <div className="product-review-rating">
                  <div className="product-rating">
                    <h6 className="price-number">
                      {convertCurrency(storeData?.pivot?.single_price)}
                    </h6>
                  </div>
                </div>
              </div>
            </div>

            <div className="review-box">
              <SimpleInputField
                nameList={[
                  {
                    name: "reason",
                    placeholder: t("EnterReason"),
                    type: "textarea",
                    toplabel: "Reason",
                    require: "true",
                    rows: 3,
                  },
                ]}
              />
            </div>

            <div className="review-box">
              <SimpleInputField
                nameList={[
                  {
                    name: "notes",
                    placeholder: t("Notes") || "Notes",
                    type: "textarea",
                    toplabel: "Notes",
                    rows: 3,
                  },
                ]}
              />
            </div>

            <div className="review-box">
              <div className="form-box">
                <label className="form-label">{t("Attachments") || "Attachments"}</label>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <input
                    ref={uploadInputRef}
                    className="form-control"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => appendFiles(e.currentTarget.files, setFieldValue)}
                  />
                  <input
                    ref={cameraInputRef}
                    className="d-none"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => appendFiles(e.currentTarget.files, setFieldValue)}
                  />
                  <Btn
                    className="btn-outline"
                    type="button"
                    title={t("OpenCamera") || "Open Camera"}
                    onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                  />
                </div>
                {errors["attachments"] && touched["attachments"] && (
                  <div className="invalid-feedback d-block">{errors["attachments"]}</div>
                )}
                {attachmentItems.length > 0 && (
                  <div className="d-flex gap-2 flex-wrap mt-2">
                    {attachmentItems.map((item, index) => (
                      <div key={index} className="position-relative">
                        {item.isImage ? (
                          <img src={item.url} alt="attachment" width={56} height={56} />
                        ) : (
                          <div className="border p-2">{item.file.name}</div>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-danger position-absolute top-0 end-0"
                          onClick={() => removeAttachment(index, setFieldValue)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="refund-footer-button">
              <Btn
                className="btn-md btn-outline fw-bold"
                title="Cancel"
                type="button"
                onClick={() => setModal("")}
              />
              <Btn className="btn-solid" title="Submit" type="submit" />
            </div>
          </Form>
        )}
      </Formik>
    </CustomModal>
  );
};

export default ExchangeModal;
