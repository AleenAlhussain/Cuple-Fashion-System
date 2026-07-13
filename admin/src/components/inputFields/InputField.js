import { Field } from "formik";
import InputWrapper from "../../utils/hoc/InputWrapper";
import { ReactstrapInput } from "../reactstrapFormik";

const InputField = ({ name, ...rest }) => {
  return <Field type="text" name={name} id={name} {...rest} component={ReactstrapInput} />;
};
export default InputWrapper(InputField);
