import NoDataFound from "@/components/commonComponent/NoDataFound";
import { mimeImageMapping } from "@/data/MimeImageType";
import { isAttachmentImage, resolveAttachmentPreviewUrl } from "@/utils/customFunctions/resolveAttachmentUrl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Input, Label } from "reactstrap";
import Loader from "@/components/commonComponent/Loader";

const ModalData = ({ state, dispatch, multiple, attachmentsData, refetch, redirectToTabs, isLoading }) => {
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    // Reset per-item error cache after data refresh so fixed URLs can render.
    setImageErrors({});
  }, [attachmentsData]);

  // Check if an item is selected
  const isSelected = (itemId) => {
    if (!state?.selectedImage || !Array.isArray(state.selectedImage)) return false;
    return state.selectedImage.some((img) => img?.id === itemId);
  };

  const ChoseImages = (e, item) => {
    if (multiple) {
      const isCurrentlySelected = isSelected(item.id);
      if (isCurrentlySelected) {
        // Remove from selection
        const removeDuplicatesImage = (state.selectedImage || []).filter((el) => el.id !== item.id);
        dispatch({
          type: "SELECTEDIMAGE",
          payload: removeDuplicatesImage,
        });
      } else {
        // Add to selection
        dispatch({
          type: "SELECTEDIMAGE",
          payload: [...(state.selectedImage || []), item],
        });
      }
    } else {
      // Single selection mode - toggle or select
      const isCurrentlySelected = isSelected(item.id);
      if (isCurrentlySelected) {
        dispatch({ type: "SELECTEDIMAGE", payload: [] });
      } else {
        dispatch({ type: "SELECTEDIMAGE", payload: [item] });
      }
    }
  };

  // Get the proper image URL with fallbacks
  const getImageUrl = (result) => {
    if (!isAttachmentImage(result)) {
      return mimeImageMapping[result?.mime_type] || "/assets/images/folder.png";
    }

    const absolute = resolveAttachmentPreviewUrl(result);
    return absolute || "/assets/images/placeholder.png";
  };

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <>
      {isLoading && !attachmentsData?.length ? (
        <div className="w-100 py-5 d-flex justify-content-center">
          <Loader />
        </div>
      ) : attachmentsData?.length > 0 ? (
        attachmentsData?.map((elem, i) => {
          const imageUrl = imageErrors[elem.id] ? "/assets/images/placeholder.png" : getImageUrl(elem);

          return (
            <div key={elem.id || i}>
              <div className="library-box">
                <Input type="checkbox" id={elem.id} checked={isSelected(elem.id)} onChange={(e) => ChoseImages(e, elem)} />
                <Label htmlFor={elem.id}>
                  <div className="ratio ratio-1x1">
                    <Image
                      src={imageUrl}
                      className="img-fluid"
                      alt={elem.name || "media"}
                      height={100}
                      width={100}
                      unoptimized
                      style={{ objectFit: 'cover' }}
                      onError={() => handleImageError(elem.id)}
                    />
                  </div>
                </Label>
              </div>
            </div>
          );
        })
      ) : (
        <NoDataFound noImage={false} title={"NoMediaFound"} />
      )}
    </>
  );
};

export default ModalData;
