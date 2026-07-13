"use client";
import NotFoundPage from "@/components/pages/404";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Loader from "@/layout/loader";
import React, { useContext } from "react";

const PageNotFound = () => {
  const { isLoading } = useContext(ThemeOptionContext);

  if (isLoading) return <Loader />;
  return <NotFoundPage />;
};

export default PageNotFound;
