import ThemeOptionContext from "@/context/themeOptionsContext";
import { resolveImageUrl } from "@/utils/constants";
import Image from "next/image";
import { useContext } from "react";

const AboutUsImage = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const bannerUrl = resolveImageUrl(themeOption?.about_us?.about?.content_bg_image_url);

  return (
    <div className="banner-section mt-2">
      {bannerUrl && <Image src={bannerUrl} className="img-fluid" height={385} width={1370} alt="about-us-1" />}
    </div>
  );
};

export default AboutUsImage;
