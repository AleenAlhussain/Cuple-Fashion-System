import SimpleInputField from "@/components/inputFields/SimpleInputField";
import { useTranslation } from "react-i18next";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import FileUploadField from "@/components/inputFields/FileUploadField";
import { mediaConfig } from "@/data/MediaConfig";

const ProductVideoTab = ({ values, setFieldValue }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <SimpleInputField
        nameList={[
          { name: `[content][product_video][tag]`, placeholder: t("EnterTag"), title: "Tag" },
          { name: `[content][product_video][title]`, placeholder: t("EnterDescription"), title: "Title" },
        ]}
      />
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="productImage" title="Image" id="productImage" showImage={values["productImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("806x670px")} />
      <FileUploadField paramsProps={{ mime_type: mediaConfig.video.join(",") }} name="productVideo" title="Video" id="productVideo" showImage={values["productVideo"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={"*Upload video size 10mb recommended"} />
    </>
  );
};

export default ProductVideoTab;
