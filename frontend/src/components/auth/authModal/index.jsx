import ThemeOptionContext from "@/context/themeOptionsContext";
import Btn from "@/elements/buttons/Btn";
import { Href } from "@/utils/constants";
import Cookies from "js-cookie";
import { usePathname, useRouter } from "next/navigation";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiCloseLine, RiWhatsappLine } from "react-icons/ri";
import { Modal, ModalBody } from "reactstrap";
import ForgotPasswordForm from "./ForgotPasswordForm";
import LoginForm from "./LoginForm";
import OTPVerificationForm from "./OTPVerificationForm";
import NumberLoginForm from "./phnLogin/LoginForm";
import RegisterForm from "./RegisterForm";

const AuthModal = () => {
  const [state, setState] = useState("login");
  const [title, setTitle] = useState("Sign in");
  const { t } = useTranslation("common");
  const [logOrNew, setLogOrNew] = useState(false);
  const { openAuthModal, setOpenAuthModal, themeOption } = useContext(ThemeOptionContext);
  const router = useRouter();

  const handleClick = () => {
    setState(state == "login" ? "register" : "login");
    setLogOrNew(!logOrNew);
  };

  const protectedRoutes = [`/account/dashboard`, `/account/notifications`, `/account/wallet`, `/account/bank-details`, `/account/point`, `/account/refund`, `/account/exchange`, `/account/order`, `/account/addresses`, `/wishlist`];

  useEffect(() => {
    if (state == "forgot") {
      setTitle("ForgotPassword");
    } else if (state == "otp") {
      setTitle("Otp");
    } else if (state == "register") {
      setTitle("CreateAccount");
    } else if (state == "number") {
      setTitle("LoginWithNumber");
    } else {
      setTitle("SignIn");
    }
  }, [state]);

  return (
    <Modal toggle={() => setOpenAuthModal(false)} className="auth-modal mt-5" isOpen={openAuthModal} centered size="lg">
      <ModalBody>
        <div className="modal-content-inner">
              <div className="d-flex">
                <div className="right-content w-lg-50 w-100">
                  <Btn className="btn-close auth-close-btn" onClick={() => setOpenAuthModal(false)}>
                    <RiCloseLine />
                  </Btn>
                  <div>
                    <div className="auth-title">
                      <h3>{t(title)}</h3>
                      {(state == "otp" || state == "number") && <p>{state == "otp" ? t("OtpDescription") : t("NumberLoginDescription")}</p>}
                    </div>
                    {state == "register" && <RegisterForm />}
                    {state == "login" && <LoginForm setState={setState} />}
                    {state == "forgot" && <ForgotPasswordForm setState={setState} />}
                    {state == "otp" && <OTPVerificationForm setState={setState} />}
                    {state == "number" && <NumberLoginForm setState={setState} />}
                    {state !== "forgot" && state !== "otp" && (
                      <>
                        <div className="divider">
                          <span>{t("OR")}</span>
                        </div>
                        <p className="create">
                          {state == "login" ? t("Don'thaveanaccount") : t("Alreadyhaveanaccount")}{" "}
                          <a href={Href} onClick={(e) => { e.preventDefault(); handleClick(); }}>
                            {logOrNew ? t("Login") : t("Register")} {t("Here")}
                          </a>
                        </p>
                        
                        {state == "login" && (
                          <Btn color="transparent" className="number-btn" onClick={() => setState("number")}>
                            <RiWhatsappLine />
                            {t("LoginWithNumber")}
                          </Btn>
                        )}

                      </>
                    )}
                  </div>
                </div>
                <div className="left-img w-lg-50 d-lg-block d-none">{/* <Image height={1920} width={1920} src={themeOption?.popup?.auth?.image_url ? storageURL + themeOption?.popup?.auth?.image_url : ` ${ImagePath}/placeholder/auth.png`} alt="login" /> */}</div>
              </div>
            </div>
      </ModalBody>
    </Modal>
  );
};

export default AuthModal;
