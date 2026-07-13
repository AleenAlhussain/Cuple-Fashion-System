import ThemeOptionContext from "@/context/themeOptionsContext";
import Btn from "@/elements/buttons/Btn";
import { ImagePath, resolveImageUrl } from "@/utils/constants";
import { emailSchema, YupObject } from "@/utils/validation/ValidationSchema";
import { ErrorMessage, Field, Form, Formik } from "formik";
import Cookies from "js-cookie";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalBody } from "reactstrap";

const NewsLetterModal = ({ setMakeExitActive }) => {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const { themeOption } = useContext(ThemeOptionContext);

  const nl = themeOption?.popup?.news_letter || {};
  const isEnabled = Boolean(nl?.is_enable);
  const delayMs = Number(nl?.delay_ms ?? 3000);
  const cookieDays = Number(nl?.cookie_days ?? 30);

  useEffect(() => {
    if (!isEnabled) return;

    const cookieVal = Cookies.get("newsletter");
    if (cookieVal) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
      Cookies.set("newsletter", "1", { expires: cookieDays });
    }, delayMs);

    return () => clearTimeout(timer);
  }, [isEnabled, delayMs, cookieDays]);

  if (!isEnabled) return null;

  const title = nl?.title || "NEWSLETTER";
  const desc = nl?.description || "";
  const buttonText = nl?.button_text || t("Subscribe");
  const imageSrc =
    resolveImageUrl(nl?.image_url) || `${ImagePath}/placeholder/two_column_banner.png`;

  return (
    <Modal
      centered
      isOpen={isOpen}
      toggle={() => {
        setIsOpen(false);
        setMakeExitActive(true);
      }}
      size="xl"
      className="d-block theme-modal-2 auth-modal fade show"
    >
      <div className="modal-dialog modal-dialog-centered open">
        <ModalBody>
          <div className="d-flex">
            <div className="right-content w-lg-50 w-100">
              <div>
                <div className="auth-title">
                  <h2>{title}</h2>
                  <p>{desc}</p>
                </div>

                <Formik
                  initialValues={{ email: "" }}
                  validationSchema={YupObject({ email: emailSchema })}
                  onSubmit={() => {
                    setIsOpen(false);
                  }}
                >
                  {({ errors, touched }) => (
                    <Form className="auth-form">
                      <div className="form-group text-center mb-0">
                        <Field
                          type="email"
                          className="form-control mb-3 input-padding"
                          placeholder={t("enter_your_email")}
                          name="email"
                        />
                        {errors?.email && touched?.email && (
                          <ErrorMessage
                            name="email"
                            render={() => (
                              <div className="invalid-feedback d-block">
                                {errors?.email}
                              </div>
                            )}
                          />
                        )}
                        <Btn className="btn-solid" type="submit">
                          <span className="d-sm-inline-block d-none">{buttonText}</span>
                        </Btn>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>

            <div className="left-img w-lg-50 d-lg-block d-none">
              <img src={imageSrc} alt="Newsletter" className="img-fluid" />
            </div>
          </div>
        </ModalBody>
      </div>
    </Modal>
  );
};

export default NewsLetterModal;
