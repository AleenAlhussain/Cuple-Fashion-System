import Image from "next/image";
import { useContext } from "react";
import SettingContext from "../../../helper/settingContext";
import Logo from "./Logo";
import ToggleButton from "./ToggleButton";

const LogoWrapper = ({ setSidebarOpen }) => {
  const { state } = useContext(SettingContext);
  return (
    <div className="logo-wrapper logo-wrapper-center">
      <Logo />
      {state?.setTinyLogo?.original_url ? <Image className="img-fluid logo-sm w-auto" src={state?.setTinyLogo?.original_url ? state?.setTinyLogo?.original_url : null} alt="Tiny Logo" width={150} height={29} /> :null}
      <ToggleButton setSidebarOpen={setSidebarOpen} />
    </div>
  );
};

export default LogoWrapper;
