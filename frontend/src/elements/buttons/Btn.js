import React from "react";
import { Button } from "reactstrap";
import { useTranslation } from "react-i18next";

const Btn = (props) => {
  const { t } = useTranslation("common");
  const { loading, children, iconClass, title, ...rest } = props;

  return (
    <Button {...rest} color={props.color ? props.color : "transparent"}>
      {loading ? (
        <div className={`d-flex position-relative justify-content-center${loading ? " spinning" : ""}`}>
          {children}
          {iconClass && <i className={iconClass}></i>}
          {t(title)}
        </div>
      ) : (
        <>
          {children}
          {t(title)}
        </>
      )}
    </Button>
  );
};

export default Btn;
