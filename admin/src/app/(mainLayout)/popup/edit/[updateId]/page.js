'use client';

import { use } from "react";
import PopupForm from "@/components/popup/PopupForm";

const EditPopup = ({ params }) => {
  const resolvedParams = use(params);
  return <PopupForm updateId={resolvedParams?.updateId} title="EditPopup" buttonName="Update Popup" />;
};

export default EditPopup;
