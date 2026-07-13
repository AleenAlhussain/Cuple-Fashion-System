import { useTranslation } from "react-i18next";
import { BiCheckShield, BiError } from "react-icons/bi";

const ShowBox = ({ showBoxMessage }) => {
  const { t, i18n } = useTranslation("common");
  if (!showBoxMessage) return null;
  const translatedMessage = i18n.exists(showBoxMessage) ? t(showBoxMessage) : showBoxMessage;
  return (
    <div className={showBoxMessage ? "error-box" : "success-box"}>
      {showBoxMessage ? <BiError /> : <BiCheckShield />}
      <div>
        <h4>{showBoxMessage ? t("ThereWasAProblem") : t("Success")} </h4>
        <p>{translatedMessage}</p>
      </div>
    </div>
  );
};

export default ShowBox;
