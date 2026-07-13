import Image from "next/image";
import { useEffect, useState } from "react";
import { Col, Input, Label } from "reactstrap";
import { RiInformationLine } from "react-icons/ri";
import NoDataFound from "../../commonComponent/NoDataFound";
import { isAttachmentImage, resolveAttachmentPreviewUrl } from "@/utils/customFunctions/resolveAttachmentUrl";
import AttachmentDetailsModal from "./AttachmentDetailsModal";

const AttachmentData = ({ state, dispatch, attachmentsData, refetch }) => {
  const [imageErrors, setImageErrors] = useState({});
  const [detailsItem, setDetailsItem] = useState(null);

  useEffect(() => {
    setImageErrors({});
  }, [attachmentsData]);

  let mimeImageMapping = [
    { mimeType: "application/pdf", imagePath: "/assets/images/pdf.png" },
    { mimeType: "application/msword", imagePath: "/assets/images/word.png" },
    { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", imagePath: "/assets/images/word.png" },
    { mimeType: "application/vnd.ms-excel", imagePath: "/assets/images/xls.png" },
    { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", imagePath: "/assets/images/xls.png" },
    { mimeType: "application/vnd.ms-powerpoint", imagePath: "/assets/images/folder.png" },
    { mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", imagePath: "/assets/images/folder.png" },
    { mimeType: "text/plain", imagePath: "/assets/images/txt.png" },
    { mimeType: "audio/mpeg", imagePath: "/assets/images/sound.png" },
    { mimeType: "audio/wav", imagePath: "/assets/images/sound.png" },
    { mimeType: "audio/ogg", imagePath: "/assets/images/sound.png" },
    { mimeType: "video/mp4", imagePath: "/assets/images/video.png" },
    { mimeType: "video/webm", imagePath: "/assets/images/video.png" },
    { mimeType: "video/ogg", imagePath: "/assets/images/video.png" },
    { mimeType: "application/zip", imagePath: "/assets/images/zip.png" },
    { mimeType: "application/x-tar", imagePath: "/assets/images/zip.png" },
    { mimeType: "application/gzip", imagePath: "/assets/images/zip.png" },
  ];

  // Deleting the selected images from media module
  const ChoseImages = (e, item) => {
    let temp = [...state.deleteImage];
    if (temp?.includes(item.id) && !e.target.checked) {
      temp.splice(temp.indexOf(item.id), 1);
      dispatch({ type: "DeleteSelectedImage", payload: temp });
    }
    if (e.target.checked) {
      dispatch({ type: "DeleteSelectedImage", payload: [...state.deleteImage, item.id] });
    }
  };

  const getMimeTypeImage = (mimeType) => {
    return mimeImageMapping?.find((value) => value.mimeType === mimeType)?.imagePath;
  };

  const handleImageError = (id) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };
  return (
    <>
    {attachmentsData?.length > 0 ? (
      attachmentsData.map((elem, i) => {
        const isImage = isAttachmentImage(elem);
        const resolvedImageUrl = resolveAttachmentPreviewUrl(elem);
        const imageUrl = imageErrors[elem?.id]
          ? "/assets/images/placeholder.png"
          : isImage
            ? resolvedImageUrl || "/assets/images/placeholder.png"
            : getMimeTypeImage(elem.mime_type) || "/assets/images/placeholder.png";

        return imageUrl ? (
          <Col key={i}>
            <div className="library-box">
              <Input type="checkbox" id={elem.id} checked={state.deleteImage?.includes(elem.id)} onChange={(e) => ChoseImages(e, elem)} />
              <Label htmlFor={elem.id}>
                <div className="ratio ratio-1x1">
                  <Image
                    src={imageUrl}
                    className="img-fluid"
                    alt="attachment"
                    height={150}
                    width={150}
                    unoptimized
                    style={{ objectFit: 'cover' }}
                    onError={() => handleImageError(elem?.id)}
                  />
                </div>
              </Label>
              <button
                type="button"
                className="library-box__info-btn"
                title="View details"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDetailsItem(elem);
                }}
              >
                <RiInformationLine size={16} />
              </button>
              {elem?.name && <div className="library-box__caption">{elem.name}</div>}
            </div>
          </Col>
        ) : null; // If imageUrl is empty, do not render the Image component
      })
    ) : (
      <NoDataFound noImage={false} title="NoMediaFound" />
    )}
    <AttachmentDetailsModal item={detailsItem} onClose={() => setDetailsItem(null)} />
  </>
  );
};

export default AttachmentData;
