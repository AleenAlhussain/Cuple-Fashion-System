'use client'
import SettingContext from "@/helper/settingContext";
import { updateSetting } from "@/utils/axiosUtils/API";
import useCreate from "@/utils/hooks/useCreate";
import dynamic from "next/dynamic";
import { useContext } from "react";

const Setting = () => {
  const SettingForm = dynamic(() => import("@/components/setting/SettingForm").then((mod) => mod.default), {
    // loading: () => <Loader />,
    ssr: false,
  });
  const { dispatch, setCurrencySymbol, setSettingObj, refetch } = useContext(SettingContext)
  const { mutate, isLoading } = useCreate(updateSetting, false, false, false, (resDta) => {
    if (resDta.status == 200 || resDta.status == 201) {
      const payload = resDta?.data?.data || resDta?.data || {};
      const values = payload?.values || {};
      const general = values?.general || {};

      if (general?.mode == "dark-only") document.body.classList.add("dark-only");
      else document.body.classList.remove("dark-only");
      // RTL direction is now driven by the selected language (i18n-context.jsx syncRtl).
      setCurrencySymbol(general?.default_currency?.symbol);
      if (Object.keys(values).length) {
        setSettingObj(values);
      }
      dispatch({
        type: 'SETTINGIMAGE',
        logo: general?.site_logo_image ? general?.site_logo_image : undefined,
        responsiveImage: general?.responsive_image?.original_url ? general?.responsive_image?.original_url : undefined,
        title: general?.site_title,
        tagline: general?.site_tagline,
        copyRight: general?.copyright,
        tinyLogo: general?.tiny_logo_image,
        lightLogo: general?.light_logo_image,
        darkLogo: general?.dark_logo_image,
        favicon: general?.favicon_image,
      })
      refetch?.();
    }
  });
  return <SettingForm mutate={mutate} loading={isLoading} title={"Settings"} />;
};

export default Setting;
