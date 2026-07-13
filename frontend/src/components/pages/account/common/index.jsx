import Avatar from "@/components/widgets/Avatar";
import { useAuthState } from "@/states";
import useCreate from "@/utils/hooks/useCreate";
import React, { useRef, useState, useEffect } from "react";
import { RiCloseLine, RiImageEditLine, RiPencilFill } from "react-icons/ri";
import { Input } from "reactstrap";

const SidebarProfile = () => {
  const { accountData, refetch, setAccountData } = useAuthState();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering user data after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  const fileInputRef = useRef(null);
  const handleImageLabelClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  const { mutate } = useCreate(`/self`, false, false, "profile updated successfully", () => refetch());
  const handleOnChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("_method", "PUT");
    mutate(formData);
    event.target.value = "";
  };

  const handleRemove = () => {
    const formData = new FormData();
    formData.append("avatar", "");
    formData.append("_method", "PUT");
    mutate(formData);
    if (setAccountData) {
      setAccountData((prev) => (prev ? { ...prev, profile_image: null } : prev));
    }
  };

  // Use consistent values for SSR and initial client render
  const displayName = mounted ? accountData?.name : '';
  const displayEmail = mounted ? accountData?.email : '';
  const displayImage = mounted ? (accountData?.profile_image || accountData?.avatar_url || accountData?.avatar || null) : null;
  const hasProfileImage = mounted && !!(accountData?.profile_image || accountData?.avatar_url || accountData?.avatar);

  return (
    <>
      <div className="profile-top">
        <div className="profile-top-box">
          <div className="profile-image">
            <div className="position-relative h-100">
              <Avatar data={displayImage} name={displayName} customImageClass={"update_img"} alt="profile-image" height={108} width={108} />
              <div className="user-icon" onClick={handleImageLabelClick}>
                <Input type="file" onChange={handleOnChange} innerRef={fileInputRef} className="d-none" accept="image/*" name="imageUpload" />
                <RiImageEditLine className=" d-lg-block d-none" />
                <RiPencilFill className="edit-icon d-lg-none" />
              </div>
              {hasProfileImage && (
                <button
                  type="button"
                  className="user-icon-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemove();
                  }}
                  aria-label="Remove profile image"
                >
                  <RiCloseLine />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="profile-detail">
          <h5>{displayName}</h5>
          <h6>{displayEmail}</h6>
        </div>
      </div>
    </>
  );
};

export default SidebarProfile;
