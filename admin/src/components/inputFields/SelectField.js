import { Field } from "formik";
import InputWrapper from "../../utils/hoc/InputWrapper";
import { ReactstrapSelect } from "../reactstrapFormik";

const SelectField = ({ name, ...rest }) => {
  return <Field type="text" name={name} id={name} component={ReactstrapSelect} {...rest} />;
};

export default InputWrapper(SelectField);
