"use client";
import { useState, useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { RiUploadCloud2Line, RiCloseLine, RiImageAddLine } from "react-icons/ri";
import Image from "next/image";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Row, Col, Input, Spinner, TabContent, TabPane, Nav, NavItem, NavLink } from "reactstrap";
import request from "@/utils/axiosUtils";
import { attachment, createAttachment } from "@/utils/axiosUtils/API";
import { useRouter } from "next/navigation";
import classnames from "classnames";
import { resolveAttachmentPreviewUrl, resolveAttachmentUrl } from "@/utils/customFunctions/resolveAttachmentUrl";

const MediaPickerField = ({
  label,
  value, // URL string or null
  onChange, // function(file, previewUrl) - file is File object for new uploads, null for existing media
  onSelect, // function(mediaItem) - called when selecting from library
  helperText,
  accept = "image/*",
  previewWidth = 200,
  previewHeight = 200,
  className = "",
}) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("1");
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const [mediaImageErrors, setMediaImageErrors] = useState({});

  // Fetch media library
  const fetchMedia = async (resetList = false) => {
    setLoading(true);
    try {
      const res = await request({
        url: attachment,
        params: { page: resetList ? 1 : page, paginate: 20, search }
      }, router);

      const data = res?.data?.data || [];
      if (resetList) {
        setMediaList(data);
        setPage(1);
      } else {
        setMediaList(prev => [...prev, ...data]);
      }
      setHasMore(data.length === 20);
    } catch (err) {
      console.error("Failed to fetch media", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when modal opens
  useEffect(() => {
    if (modalOpen) {
      fetchMedia(true);
    }
  }, [modalOpen, search]);

  useEffect(() => {
    setPreviewError(false);
  }, [value]);

  useEffect(() => {
    setMediaImageErrors({});
  }, [mediaList]);

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await request({
        url: createAttachment,
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" }
      }, router);

      if (res?.data?.data) {
        // Add to media list
        setMediaList(prev => [res.data.data, ...prev]);
        // Auto-select the uploaded file
        setSelectedMedia(res.data.data);
        setActiveTab("1"); // Switch to library tab to show selection
      }
    } catch (err) {
      console.error("Failed to upload file", err);
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset file input
    }
  };

  // Handle media selection
  const handleSelectMedia = (media) => {
    setSelectedMedia(media);
  };

  // Handle confirm selection
  const handleConfirm = () => {
    if (selectedMedia) {
      if (onSelect) {
        onSelect(selectedMedia);
      }
      if (onChange) {
        const selectedUrl = resolveAttachmentUrl(selectedMedia);
        onChange(null, selectedUrl || selectedMedia?.original_url || selectedMedia?.url || selectedMedia?.name);
      }
    }
    setModalOpen(false);
    setSelectedMedia(null);
  };

  // Handle direct file selection (without modal)
  const handleDirectFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onChange) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(file, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear selected image
  const handleClear = () => {
    if (onChange) {
      onChange(null, null);
    }
  };

  const toggleTab = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  const previewImageSrc = value ? (resolveAttachmentUrl(value) || value) : "";

  return (
    <div className={`media-picker-field ${className}`}>
      {label && <label className="form-label">{label}</label>}

      <div className="media-picker-preview-area">
        {value ? (
          <div className="media-preview position-relative" style={{ width: previewWidth, maxWidth: "100%" }}>
            <Image
              src={previewError ? "/assets/images/placeholder.png" : (previewImageSrc || "/assets/images/placeholder.png")}
              alt="Selected media"
              width={previewWidth}
              height={previewHeight}
              unoptimized
              style={{ objectFit: "cover", borderRadius: "8px", width: "100%", height: "auto" }}
              onError={() => setPreviewError(true)}
            />
            <button
              type="button"
              className="btn btn-sm btn-danger position-absolute"
              style={{ top: 5, right: 5, padding: "2px 6px" }}
              onClick={handleClear}
            >
              <RiCloseLine size={16} />
            </button>
          </div>
        ) : (
          <div
            className="media-placeholder d-flex flex-column align-items-center justify-content-center"
            style={{
              width: previewWidth,
              maxWidth: "100%",
              height: previewHeight,
              border: "2px dashed #ddd",
              borderRadius: "8px",
              cursor: "pointer",
              background: "#f8f9fa"
            }}
            onClick={() => setModalOpen(true)}
          >
            <RiImageAddLine size={40} color="#999" />
            <span className="text-muted mt-2">{t("ClickToSelectImage") || "Click to select image"}</span>
          </div>
        )}

        {value && (
          <Button
            color="secondary"
            size="sm"
            className="mt-2"
            onClick={() => setModalOpen(true)}
          >
            {t("ChangeImage") || "Change Image"}
          </Button>
        )}
      </div>

      {helperText && <small className="text-muted d-block mt-1">{helperText}</small>}

      {/* Media Library Modal */}
      <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} size="xl" centered>
        <ModalHeader toggle={() => setModalOpen(false)}>
          {t("SelectMedia") || "Select Media"}
        </ModalHeader>
        <ModalBody>
          <Nav tabs>
            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === "1" })}
                onClick={() => toggleTab("1")}
                style={{ cursor: "pointer" }}
              >
                {t("MediaLibrary") || "Media Library"}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === "2" })}
                onClick={() => toggleTab("2")}
                style={{ cursor: "pointer" }}
              >
                {t("UploadNew") || "Upload New"}
              </NavLink>
            </NavItem>
          </Nav>

          <TabContent activeTab={activeTab} className="mt-3">
            {/* Media Library Tab */}
            <TabPane tabId="1">
              <div className="mb-3">
                <Input
                  type="text"
                  placeholder={t("SearchMedia") || "Search media..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loading && mediaList.length === 0 ? (
                <div className="text-center py-5">
                  <Spinner color="primary" />
                </div>
              ) : mediaList.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  {t("NoMediaFound") || "No media found. Upload some images first."}
                </div>
              ) : (
                <>
                  <Row className="g-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {mediaList.map((media) => (
                      <Col xs={6} sm={4} md={3} lg={2} key={media.id}>
                        <div
                          className={`media-item position-relative ${selectedMedia?.id === media.id ? "selected" : ""}`}
                          onClick={() => handleSelectMedia(media)}
                          style={{
                            cursor: "pointer",
                            border: selectedMedia?.id === media.id ? "3px solid #0d6efd" : "2px solid transparent",
                            borderRadius: "8px",
                            overflow: "hidden",
                            aspectRatio: "1/1"
                          }}
                        >
                          <Image
                            src={mediaImageErrors[media?.id] ? "/assets/images/placeholder.png" : (resolveAttachmentPreviewUrl(media) || "/assets/images/placeholder.png")}
                            alt={media.name || "Media"}
                            fill
                            unoptimized
                            style={{ objectFit: "cover" }}
                            onError={() => setMediaImageErrors((prev) => ({ ...prev, [media?.id]: true }))}
                          />
                          {selectedMedia?.id === media.id && (
                            <div
                              className="selected-overlay position-absolute d-flex align-items-center justify-content-center"
                              style={{
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: "rgba(13, 110, 253, 0.3)"
                              }}
                            >
                              <span className="badge bg-primary">Selected</span>
                            </div>
                          )}
                        </div>
                        <small className="d-block text-truncate mt-1" title={media.name}>
                          {media.name}
                        </small>
                      </Col>
                    ))}
                  </Row>

                  {hasMore && (
                    <div className="text-center mt-3">
                      <Button
                        color="secondary"
                        size="sm"
                        onClick={() => {
                          setPage(p => p + 1);
                          fetchMedia(false);
                        }}
                        disabled={loading}
                      >
                        {loading ? <Spinner size="sm" /> : (t("LoadMore") || "Load More")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabPane>

            {/* Upload Tab */}
            <TabPane tabId="2">
              <div
                className="upload-area d-flex flex-column align-items-center justify-content-center py-5"
                style={{
                  border: "2px dashed #ddd",
                  borderRadius: "8px",
                  background: "#f8f9fa",
                  minHeight: "300px"
                }}
              >
                <RiUploadCloud2Line size={60} color="#999" />
                <h5 className="mt-3">{t("DropFilesHere") || "Drop files here or click to upload"}</h5>
                <p className="text-muted">{t("SupportedFormats") || "Supported formats: JPG, PNG, GIF, WEBP"}</p>

                <label className="btn btn-primary mt-3">
                  {uploading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      {t("Uploading") || "Uploading..."}
                    </>
                  ) : (
                    t("SelectFile") || "Select File"
                  )}
                  <input
                    type="file"
                    accept={accept}
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                    disabled={uploading}
                  />
                </label>
              </div>
            </TabPane>
          </TabContent>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setModalOpen(false)}>
            {t("Cancel") || "Cancel"}
          </Button>
          <Button
            color="primary"
            onClick={handleConfirm}
            disabled={!selectedMedia}
          >
            {t("Select") || "Select"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default MediaPickerField;
