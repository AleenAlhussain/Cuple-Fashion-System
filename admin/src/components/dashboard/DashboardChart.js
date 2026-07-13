import dynamic from "next/dynamic";
import { DashboardChartAPI } from "../../utils/axiosUtils/API";
import request from "../../utils/axiosUtils";
import { useContext, useEffect } from 'react';
import SettingContext from '../../helper/settingContext';
import { DashboardChartOptions } from "./ChartData";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
})

const DashboardChart = () => {
    const { convertCurrency } = useContext(SettingContext)
    const router = useRouter()

    const { data, refetch, isLoading } = useCustomQuery([DashboardChartAPI], () => request({ url: DashboardChartAPI }, router), { refetchOnWindowFocus: false, enabled: false, select: (data) => data?.data });
    useEffect(() => {
        refetch()
    }, [])
    return (
        <ReactApexChart options={DashboardChartOptions(data, convertCurrency).options} series={DashboardChartOptions(data, convertCurrency).series} type="line" height={350} />
    )
}

export default DashboardChart