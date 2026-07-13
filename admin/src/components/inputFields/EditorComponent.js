import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { ErrorMessage } from "formik";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

function EditorComponent({ name, onChange, editorLoaded, value = "", onBlur }) {
  const { t } = useTranslation("common");
  const editor = useRef(null);
  const [content, setContent] = useState(value);

  useEffect(() => {
    setContent(value || "");
  }, [value]);

  return (
    <div>
      {editorLoaded ? (
        <JoditEditor
          ref={editor}
          value={content}
          config={{
            height: 250,
            readonly: false,
          }}
          tabIndex={1}
          onBlur={(newContent) => {
            setContent(newContent || "");
            onBlur && onBlur(newContent);
          }}
          onChange={(newContent) => {
            setContent(newContent || "");
            const plainText = newContent
              .replace(/<[^>]*>/g, "")
              .replace(/&nbsp;/g, "")
              .trim();
            onChange && onChange(plainText === "" ? "" : newContent);
          }}
        />
      ) : (
        <div>{t("Editorloading")}</div>
      )}
      <ErrorMessage name={name} render={(msg) => <div className='invalid-feedback d-block'>{t(msg)}</div>} />
    </div>
  );
}

export default EditorComponent;
