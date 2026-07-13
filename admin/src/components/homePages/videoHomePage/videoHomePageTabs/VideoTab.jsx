import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import { mediaConfig } from "@/data/MediaConfig";
import { useTranslation } from "react-i18next";

const VideoTab = ({ values, setFieldValue }) => {
  const { t } = useTranslation("common");
  return (
    <>
      <FileUploadField paramsProps={{ mime_type: mediaConfig.video.join(",") }} name={`videoFile`} title="Video" id={`videoFile`} type="file" values={values} setFieldValue={setFieldValue} showImage={values[`videoFile`]} helpertext={"*Upload video size 10mb recommended"} />
      <CheckBoxField name={`[content][video][status]`} title="Status" />
    </>
  );
};

export default VideoTab;
