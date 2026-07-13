import { useTranslation } from "react-i18next";
import { Button } from "reactstrap";

const Btn = ({loading=false, ...props}) => { 
  const { t } = useTranslation( 'common');
  return (
    <Button {...props}>
      <div className={`d-flex align-items-center position-relative${loading ? " spinning" : ""}`}>
        {props.children}
        {t(props.title)}
      </div>
    </Button>
  );
};
export default Btn;
