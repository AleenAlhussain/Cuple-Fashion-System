"use client";
import SellerPoster from "./SellerPoster";
import SellerService from "./SellerService";
import SellerBusiness from "./SellerBusiness";
import SellerSelling from "./SellerSelling";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { useContext } from "react";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Loader from "@/layout/loader";

const BecomeSellerContent = () => {
  const { isLoading } = useContext(ThemeOptionContext);
  if (isLoading) {
    return <Loader />;
  }
  return (
    <>
      <Breadcrumbs title={"BecomeVendor"} subNavigation={[{ name: "BecomeVendor" }]} />
      <SellerPoster />
      <SellerService />
      <SellerBusiness />
      <SellerSelling />
    </>
  );
};

export default BecomeSellerContent;
