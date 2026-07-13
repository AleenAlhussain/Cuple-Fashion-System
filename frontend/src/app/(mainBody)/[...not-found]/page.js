"use client";
import NotFoundPage from "@/components/pages/404";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Loader from "@/layout/loader";
import { useParams } from "next/navigation";
import React, { useContext } from "react";

const NotFound = () => {
  const params = useParams();
  const { isLoading } = useContext(ThemeOptionContext);
  if (isLoading) return <Loader />;
  return <NotFoundPage params={params} />;
};

export default NotFound;
