import { useEffect, useState } from "react";
import { Col, Row } from "reactstrap";
import EditorComponent from "../inputFields/EditorComponent";
import { useTranslation } from "react-i18next";
import { ErrorMessage, getIn } from "formik";

const DescriptionInput = ({ values, setFieldValue, nameKey, errorMessage, title, helpertext }) => {
  const { t } = useTranslation("common");
  const [editorLoaded, setEditorLoaded] = useState(false);
  const fieldValue = getIn(values, nameKey) ?? values?.[nameKey] ?? "";
  useEffect(() => {
    setEditorLoaded(true);
  }, []);
  return (
    <>
            <div className="input-error">
                <Row className="mb-4 align-items-center g-md-4 g-2">
                    <Col sm={3}>
                        <span className="col-form-label form-label-title form-label">{t(title)} {errorMessage && <span className='theme-color ms-2 required-dot'>*</span>}</span>
                    </Col>
                    <Col sm={9}>
                      <EditorComponent
                        name={nameKey}
                        value={fieldValue}
                        editorLoaded={editorLoaded}
                        errorMessage={errorMessage}
                        onBlur={(data) => {
                          const plainText = data
                            .replace(/<[^>]*>/g, "")
                            .replace(/&nbsp;/g, "")
                            .trim();
                          setFieldValue(nameKey, plainText === "" ? "" : data);
                        }}
                        onChange={() => {}}
                      />
                      {helpertext && <p className='help-text'>{helpertext}</p>}
                      <ErrorMessage name={nameKey} render={(msg) => <div className='invalid-feedback d-block'>{t(errorMessage)}</div>} />
                    </Col>
                </Row>
            </div>
    </>
  );
};

export default DescriptionInput;
