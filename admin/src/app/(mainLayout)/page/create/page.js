"use client"
import FormWrapper from '@/utils/hoc/FormWrapper';
import useCreate from '@/utils/hooks/useCreate';
import { PagesAPI } from '@/utils/axiosUtils/API'
import dynamic from 'next/dynamic';
import Loader from '@/components/commonComponent/Loader';

const CreatePage = () => {
    const { mutate, isLoading } = useCreate(PagesAPI, false, "/page");
    const PageForm = dynamic(()=> import('@/components/pages/PageForm') .then((mod) => mod.default), {
        loading: () => <Loader />,
        ssr: false,
      });
    return (
        <FormWrapper title="CreatePage">
            <PageForm mutate={mutate} loading={isLoading} buttonName="Save" />
        </FormWrapper>
    )
}

export default CreatePage
