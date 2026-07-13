'use client'

import ThemeOptionForm from "@/components/themeOption";
import { ThemeOptions } from "@/utils/axiosUtils/API";
import useCreate from "@/utils/hooks/useCreate";
import { useQueryClient } from "@tanstack/react-query";

const ThemeOption = () => {
    const queryClient = useQueryClient();

    // After successful save, invalidate the query to refetch fresh data
    const onSuccess = () => {
        queryClient.invalidateQueries([ThemeOptions]);
    };

    const { mutate, isLoading } = useCreate(ThemeOptions, false, '/theme_option', 'Theme options saved successfully!', onSuccess);
    return <ThemeOptionForm mutate={mutate} loading={isLoading} title={"ThemeOption"} />;
}

export default ThemeOption
