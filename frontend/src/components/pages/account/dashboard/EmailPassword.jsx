import { useAuthState } from "@/states";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import EmailPasswordModal from "./EmailPasswordModal";
import { Href } from "@/utils/constants";

const EmailPassword = () => {
  const { accountData } = useAuthState();
  const [modal, setModal] = useState("");
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation("common");

  // Prevent hydration mismatch by only rendering user data after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="row">
        <div className="col-sm-6">
          <h6>
            {t("Email")} : {mounted ? accountData?.email : ""}
          </h6>
          <a href={Href} onClick={() => setModal("email")}>
            {t("Edit")}
          </a>
        </div>
        <div className="col-sm-6">
          <h6>
            {t("Password")} : {"●".repeat(6)}
          </h6>
          <a href={Href} onClick={() => setModal("password")}>
            {t("Edit")}
          </a>
        </div>
      </div>
      <EmailPasswordModal modal={modal} setModal={setModal} />
    </>
  );
};

export default EmailPassword;
