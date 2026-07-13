import { useGetHomeFashionOne, useGetHomeFashionTwo, useGetHomeFashionThree, useGetHomeFashionFour, useGetHomeFashionFive, useGetHomeFashionSix, useGetHomeFashionSeven, useGetHomeVideo, useGetHomeVideoSlider, useGetHomeSingleProduct, useGetHomeDigitalDownload } from "@/utils/api";

const useCustomDataQuery = ({ params }) => {
  const hooks = {
    fashion_one: useGetHomeFashionOne,
    fashion_two: useGetHomeFashionTwo,
    fashion_three: useGetHomeFashionThree,
    fashion_four: useGetHomeFashionFour,
    fashion_five: useGetHomeFashionFive,
    fashion_six: useGetHomeFashionSix,
    fashion_seven: useGetHomeFashionSeven,
    video: useGetHomeVideo,
    video_slider: useGetHomeVideoSlider,
    single_product: useGetHomeSingleProduct,
    digital_download: useGetHomeDigitalDownload,
  };

  const useHook = hooks[params] || useGetHomeFashionOne;
  const { data, isLoading, refetch } = useHook({}, {
    enabled: true,
    refetchOnWindowFocus: false
  });

  return {
    data: data?.data || {},
    isLoading,
    refetch
  };
};

export default useCustomDataQuery;
