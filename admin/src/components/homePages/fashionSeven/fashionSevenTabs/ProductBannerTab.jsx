import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import { mediaConfig } from "@/data/MediaConfig";
import { getHelperText } from "@/utils/customFunctions/getHelperText";

const ProductBannerTab = ({ values, setFieldValue, isTitleDescription, helpertext, categoryData, setSearch, productData }) => {

  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="productBannerImage" title="Image" id="productBannerImage" showImage={values["productBannerImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText(helpertext || " 375x586px")} />
      <SearchableSelectInput
        nameList={[
          {
            name: "productBannerProducts",
            title: "Products",
            inputprops: {
              name: "productBannerProducts",
              id: "productBannerProducts",
              options: productData || [],
              setsearch: setSearch,
            },
          },
        ]}
      />
      <CheckBoxField name={`[content][product_banner][status]`} title="Status" />
    </>
  );
};
export default ProductBannerTab;
