"use client";
import ThemeOptionProvider from "@/context/themeOptionsContext/ThemeOptionProvider";
import { HydrationBoundary, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastContainer } from "react-toastify";
import SubLayout from "./SubLayout";

const MainLayout = ({ children }) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes before refetching
        staleTime: 5 * 60 * 1000,
        // Keep unused data in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Don't refetch when window regains focus
        refetchOnWindowFocus: false,
        // Don't refetch on reconnect
        refetchOnReconnect: false,
        // Retry failed requests once
        retry: 1,
      },
    },
  }));

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={children.dehydratedState}>
          <ThemeOptionProvider>
            <SubLayout>{children}</SubLayout>
          </ThemeOptionProvider>
        </HydrationBoundary>
      </QueryClientProvider>
      <ToastContainer autoClose={2000} theme="colored" />
    </>
  );
};

export default MainLayout;
