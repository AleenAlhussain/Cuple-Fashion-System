import { mimeImageMapping } from "@/data/MimeImageType";
import { ErrorMessage } from "formik";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { RiCloseLine } from "react-icons/ri";
import { Input } from "reactstrap";
import InputWrapper from "../../utils/hoc/InputWrapper";
import request from "../../utils/axiosUtils";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";
import { handleModifier } from "../../utils/validation/ModifiedErrorMessage";
import AttachmentModal from "../attachment/widgets/attachmentModal";
import { isAttachmentImage, resolveAttachmentUrl } from "@/utils/customFunctions/resolveAttachmentUrl";

const isAbsoluteHttpUrl = (value) =>
  typeof value === "string" && /^https?:\/\//i.test(value.trim());
const isValidAttachmentId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const hasSameOrder = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

const FileUploadField = ({ values, updateId, setFieldValue, errors, multiple, loading, showImage, paramsProps, listClassName, ...props }) => {
  const storeImageObject = props.name.replace(/_id$/, "");
  const router = useRouter();
  const { t } = useTranslation("common");
  const [modal, setModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const [dragIndex, setDragIndex] = useState(null);
  const [savedGalleryOrder, setSavedGalleryOrder] = useState([]);
  const [isOrderDirty, setIsOrderDirty] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const canReorderGallery = props?.name === "product_galleries_id" && Boolean(updateId) && multiple;
  const isRenderableMediaObject = (item) =>
    item &&
    typeof item === "object" &&
    (item.original_url || item.image_url || item.thumbnail_url || item.asset_url || item.url || item.path || item.file_name || item.name);

  const getExternalPreviewUrl = (item) => {
    if (!item || typeof item !== "object") return null;
    const candidates = [item.original_url, item.image_url, item.thumbnail_url];
    return candidates.find((candidate) => isAbsoluteHttpUrl(candidate)) || null;
  };

  useEffect(() => {
    if (values) {
      if (multiple) {
        const list = Array.isArray(values[storeImageObject]) ? values[storeImageObject] : [];
        setSelectedImage(list.filter(isRenderableMediaObject));
      } else if (isRenderableMediaObject(values[storeImageObject])) {
        setSelectedImage(loading ? null : [values[storeImageObject]]);
      } else if (isRenderableMediaObject(values[props.name])) {
        setSelectedImage([values[props.name]]);
      } else {
        // Do not render raw ID strings as "files"; wait for a real media object.
        setSelectedImage([]);
      }
    }
  }, [values[storeImageObject], values[props.name], loading]);
  useEffect(() => {
    if (props?.uniquename) {
      if (Array.isArray(props?.uniquename)) {
        const mediaObjects = props?.uniquename?.filter((data) => isRenderableMediaObject(data));
        const onlyIds = mediaObjects.map((data) => data.id).filter(Boolean);
        setSelectedImage(loading ? null : mediaObjects);
        setFieldValue(props?.name, onlyIds);
      } else if (isRenderableMediaObject(props?.uniquename)) {
        setSelectedImage(loading ? null : [props?.uniquename]);
        setFieldValue(props?.name, props?.uniquename?.id);
      }
    }
  }, [props?.uniquename, loading, showImage]);

  useEffect(() => {
    // Clear stale error flags when selection changes.
    setImageErrors({});
  }, [selectedImage]);

  useEffect(() => {
    if (!canReorderGallery || isOrderDirty) return;
    setSavedGalleryOrder(Array.isArray(selectedImage) ? selectedImage : []);
  }, [canReorderGallery, isOrderDirty, selectedImage]);

  const extractOrderedGalleryIds = (items) =>
    (items || [])
      .map((item) => Number(item?.id))
      .filter((id) => isValidAttachmentId(id));

  const updateGalleryFormOrder = (items) => {
    if (!canReorderGallery) return;
    setFieldValue(storeImageObject, items);
    setFieldValue(
      props.name,
      items.map((item) => item?.id).filter((id) => id !== null && id !== undefined)
    );
  };

  const markDirtyIfOrderChanged = (items) => {
    if (!canReorderGallery) return;
    const currentIds = extractOrderedGalleryIds(items);
    const savedIds = extractOrderedGalleryIds(savedGalleryOrder);
    setIsOrderDirty(!hasSameOrder(currentIds, savedIds));
  };

  const removeImage = (result) => {
    if (props.name) {
      if (multiple) {
        let updatedImage = selectedImage.filter((elem) => elem.id !== result.id);
        setSelectedImage(updatedImage);
        setFieldValue(storeImageObject, updatedImage);
        setFieldValue(
          props.name,
          updatedImage.map((elem) => elem?.id).filter((id) => id !== null && id !== undefined)
        );

        if (canReorderGallery && isOrderDirty && updatedImage.length !== savedGalleryOrder.length) {
          // Image set changed (not just order), treat this as new baseline for reorder.
          setSavedGalleryOrder(updatedImage);
          setIsOrderDirty(false);
        }
      } else {
        setFieldValue(props?.name, Array.isArray(values[props.name]) ? values[props.name].filter((el) => el !== result.id) : null);
        setSelectedImage(selectedImage.filter((elem) => elem.id !== result.id));
        setFieldValue(storeImageObject, "");

        // Keep both mobile image aliases in sync.
        if (storeImageObject.endsWith(".image_mobile")) {
          setFieldValue(storeImageObject.replace(/\.image_mobile$/, ".mobile_image"), "");
        } else if (storeImageObject.endsWith(".mobile_image")) {
          setFieldValue(storeImageObject.replace(/\.mobile_image$/, ".image_mobile"), "");
        }
      }
    }
  };

  const getMimeTypeImage = (result) => {
    const externalPreviewUrl = getExternalPreviewUrl(result);
    if (externalPreviewUrl) {
      return externalPreviewUrl;
    }

    // For images, return the original URL with proper handling
    if (isAttachmentImage(result)) {
      const resolved = resolveAttachmentUrl(result);
      if (resolved) {
        return resolved;
      }
      // Fallback placeholder for images
      return "/assets/images/placeholder.png";
    }
    return mimeImageMapping[result?.mime_type] ?? result?.original_url ?? "/assets/images/folder.png";
  };

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const handleThumbnailDrop = (targetIndex) => {
    if (!canReorderGallery) return;
    if (dragIndex === null || dragIndex === targetIndex) return;

    const dragItem = selectedImage?.[dragIndex];
    const targetItem = selectedImage?.[targetIndex];
    if (!dragItem || !targetItem) return;
    if (!isValidAttachmentId(dragItem?.id) || !isValidAttachmentId(targetItem?.id)) return;

    const reordered = [...selectedImage];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    setSelectedImage(reordered);
    updateGalleryFormOrder(reordered);
    markDirtyIfOrderChanged(reordered);
  };

  const resetGalleryOrder = () => {
    if (!canReorderGallery) return;
    const baseline = Array.isArray(savedGalleryOrder) ? [...savedGalleryOrder] : [];
    setSelectedImage(baseline);
    updateGalleryFormOrder(baseline);
    setIsOrderDirty(false);
    setDragIndex(null);
  };

  const saveGalleryOrder = async () => {
    if (!canReorderGallery || isSavingOrder || !isOrderDirty) return;

    const orderedIds = extractOrderedGalleryIds(selectedImage);
    if (!orderedIds.length || orderedIds.length !== selectedImage.length) {
      ToastNotification("error", "Gallery order can only be saved when every image has a valid ID.");
      return;
    }

    setIsSavingOrder(true);
    try {
      const response = await request(
        {
          url: `/products/${updateId}/galleries/reorder`,
          method: "put",
          data: { ordered_ids: orderedIds },
        },
        router
      );

      if (response?.data?.success === false) {
        throw new Error(response?.data?.message || "Failed to save gallery order.");
      }

      setSavedGalleryOrder([...selectedImage]);
      setIsOrderDirty(false);
      ToastNotification("success", response?.data?.message || "Gallery order saved.");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save gallery order.";
      ToastNotification("error", message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const ImageShow = () => {
    return (
      <>
        {selectedImage?.length > 0 &&
          selectedImage?.map((result, i) => {
            const imageUrl = imageErrors[result?.id] ? "/assets/images/placeholder.png" : getMimeTypeImage(result);
            const canDrag = canReorderGallery && isValidAttachmentId(result?.id);
            return (
              <li
                key={result?.id || i}
                draggable={canDrag}
                onDragStart={() => canDrag && setDragIndex(i)}
                onDragOver={(event) => {
                  if (canReorderGallery) {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleThumbnailDrop(i);
                }}
                onDragEnd={() => setDragIndex(null)}
                style={{
                  cursor: canDrag ? "grab" : "default",
                  opacity: dragIndex === i ? 0.55 : 1,
                }}
              >
                <div className="media-img-box">
                  {canReorderGallery && (
                    <span
                      style={{
                        position: "absolute",
                        top: 6,
                        left: 6,
                        zIndex: 2,
                        minWidth: 22,
                        height: 22,
                        borderRadius: 11,
                        background: "#00000099",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 6px",
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                  <Image
                    src={imageUrl}
                    className="img-fluid"
                    alt={result?.name || "image"}
                    height={130}
                    width={130}
                    unoptimized
                    style={{ objectFit: 'cover' }}
                    onError={() => handleImageError(result?.id)}
                  />
                  <p className="remove-icon">
                    <RiCloseLine onClick={() => removeImage(result)} />
                  </p>
                </div>
                <h6>{result?.file_name}</h6>
              </li>
            );
          })}
      </>
    );
  };
  return (
    <>
      <ul className={`image-select-list ${listClassName || ""}`}>
        <li className="choosefile-input">
          <Input
            {...props}
            onClick={(event) => {
              event.preventDefault();
              setModal(props.id);
            }}
          />
          <label htmlFor={props.id}>
            <Image height={40} width={40} src={"/assets/images/add-image.png"} className="img-fluid" alt="" />
          </label>
        </li>

        <ImageShow />

        <AttachmentModal paramsProps={paramsProps} modal={modal == props.id} name={props.name} multiple={multiple} values={values} setModal={setModal} setFieldValue={setFieldValue} setSelectedImage={setSelectedImage} selectedImage={selectedImage} showImage={showImage} redirectToTabs={true} />
      </ul>
      {canReorderGallery && (
        <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
          {isOrderDirty && (
            <>
              <button type="button" className="btn btn-sm btn-primary" onClick={saveGalleryOrder} disabled={isSavingOrder}>
                {isSavingOrder ? "Saving..." : "Save Order"}
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetGalleryOrder} disabled={isSavingOrder}>
                Reset
              </button>
            </>
          )}
          <small className="text-muted">Drag and drop gallery images to reorder.</small>
        </div>
      )}
      <p className="help-text">{props?.helpertext}</p>
      {errors?.[props?.name] ? (
        <ErrorMessage
          name={props.name}
          render={(msg) => (
            <div className="invalid-feedback d-block">
              {t(handleModifier(storeImageObject).split(" ").join(""))} {t("IsRequired")}
            </div>
          )}
        />
      ) : null}
    </>
  );
};

export default InputWrapper(FileUploadField);
