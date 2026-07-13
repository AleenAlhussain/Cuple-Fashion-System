import { useTranslation } from "react-i18next";
import Btn from "../../../../elements/buttons/Btn";

const ModalButton = ({ setModal, attachmentsData, dispatch, state, name, setSelectedImage, setFieldValue, tabNav, multiple, mutate, isLoading, showImage,values }) => {
    
    const { t } = useTranslation( 'common');
    const storeImageObject = name?.replace(/_id$/, "");
    const handleClick = (value) => {
        if (tabNav == 2) {
            if (state.setBrowserImage) {
                let formData = new FormData();
                Object.values(state.setBrowserImage.attachments).forEach((el, i) => {
                    formData.append(`attachments[${i}]`, el);
                });
                // Put Add Or Update Logic Here
            }
        } else {
            if (multiple) {
                if (Array.isArray(state.selectedImage)) {
                    setSelectedImage([...state.selectedImage]);
                    setFieldValue(storeImageObject, state.selectedImage);
                    setFieldValue(name, state.selectedImage.map((image) => image.id));
                }
            } else {
            if (state?.selectedImage?.length > 0) {
                if (showImage) {
                    setFieldValue(name, value[0]);
                } else {
                    const selectedImage = value[0];
                    const resolvedImage =
                        attachmentsData?.find((item) => item.id == selectedImage?.id) || selectedImage;
                    setFieldValue(name, resolvedImage?.id);
                    if (storeImageObject) {
                        setFieldValue(storeImageObject, resolvedImage);

                        // Home banner mobile uses legacy key "mobile_image" in parts of state.
                        // Keep both keys in sync to avoid stale value overriding on submit.
                        if (storeImageObject.endsWith(".image_mobile")) {
                            setFieldValue(storeImageObject.replace(/\.image_mobile$/, ".mobile_image"), resolvedImage);
                        } else if (storeImageObject.endsWith(".mobile_image")) {
                            setFieldValue(storeImageObject.replace(/\.mobile_image$/, ".image_mobile"), resolvedImage);
                        }
                    }
                    setSelectedImage(resolvedImage ? [resolvedImage] : []);
                }
            }
            }
        }
        setModal(false);
    };
    return (
        <>
            <div className="media-bottom-btn">
                <div className="left-part">
                    <div className="file-detail">
                        <h6>{state.selectedImage?.length || 0} {t("FileSelected")}</h6>
                        <a href="#" className="font-red" onClick={() => dispatch({ type: "SELECTEDIMAGE", payload: [] })}>{t("Clear")}</a>
                    </div>
                </div>
                <div className="right-part">
                    <Btn type="submit" className="btn btn-solid" title={tabNav === 2 ? "Submit" : t("InsertMedia")} loading={Number(isLoading)} onClick={() => handleClick(state.selectedImage)} />
                </div>
            </div>
        </>
    );
};

export default ModalButton;
