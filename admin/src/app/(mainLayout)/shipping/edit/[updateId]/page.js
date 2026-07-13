"use client";
import Loader from "@/components/commonComponent/Loader";
import NoDataFound from "@/components/commonComponent/NoDataFound";
import FormsShippingRuleCreation from "@/components/shipping/FormsShippingRuleCreation";
import ShowModal from "@/elements/alerts&Modals/Modal";
import Btn from "@/elements/buttons/Btn";
import request from "@/utils/axiosUtils";
import { shipping, shippingRule } from "@/utils/axiosUtils/API";
import SuccessHandle from "@/utils/customFunctions/SuccessHandle";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useCustomMutation from "@/utils/hooks/useCustomMutation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiPlus } from "react-icons/fi";
import { RiArrowDownSLine, RiArrowLeftLine } from "react-icons/ri";
import NoCategorySVG from "../../../../../../public/assets/svg/no-category.png";

const AddShippingRules = () => {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation("common");
  const [active, setActive] = useState(false);
  const updateId = params?.updateId;
  const { data, isLoading, refetch } = useCustomQuery([`${shipping}/edit/${updateId}`], () => request({ url: `${shipping}/${updateId}` }, router), {
    enabled: false,
    refetchOnWindowFocus: false,
    select: (response) => response?.data?.data || null,
  });
  const { data: shippingZones = [] } = useCustomQuery([shipping], () => request({ url: shipping }, router), {
    refetchOnWindowFocus: false,
    select: (response) => response?.data?.data || [],
  });
  const shippingOptions = (shippingZones || []).map((zone) => ({
    id: zone?.id,
    name: zone?.country?.name || zone?.name || `Zone #${zone?.id}`,
  }));
  const getRuleLabel = (rule) => {
    if (rule?.fee_method === "fixed_by_quantity" || rule?.rule_type === "base_on_quantity") {
      const from = rule?.min_item_qty ?? 1;
      const to = rule?.max_item_qty ? rule.max_item_qty : "∞";
      return `${rule?.name || t("ShippingFee")} (${from} - ${to})`;
    }
    return rule?.name || t("ShippingFee");
  };
  
  const { mutate: createMutate, isLoading: createMutateIsLoading } = useCustomMutation((data) => request({ url: shippingRule, data, method: "post" }, router), {
    onSuccess: (resData) => {
      SuccessHandle(resData, false, `${shipping}/edit/${updateId}`, t("ShippingCreatedSuccessFully"));
      resData.status === 201 && setActive(false);
      refetch();
    },
    onError: () => ToastNotification("error"),
  });
  const { mutate: updateMutate, isLoading: updateLoading } = useCustomMutation((data) => request({ url: shippingRule + "/" + active, method: "put", data }, router), {
    onSuccess: (resData) => {
      SuccessHandle(resData, false, `${shipping}/edit/${updateId}`, t("RuleUpdatedSuccessfully"));
      resData.status === 200 && setActive(false);
      refetch();
    },
  });
  useEffect(() => {
     refetch();
  }, [updateId]);

  if (isLoading && updateId ) return <Loader />;
  return (
    <FormWrapper
      title={data?.country?.name}
      modal={
        <div className="d-flex">
          <Btn className="me-2 btn-outline btn-lg add-button back-button btn-light-bg" title="Back" onClick={() => router.back()}>
            <RiArrowLeftLine className="me-2" />
          </Btn>
          <Btn className="align-items-center btn-theme add-button" title={"Add Shipping Rule"} onClick={() => setActive({ create: data?.id })}>
            <FiPlus />
          </Btn>
        </div>
      }
    >
      <div className="dflex-wgap">
        <ShowModal title={"AddShippingRule"} modalAttr={{ className: "modal-lg" }} setModal={setActive} open={active?.create === data?.id ? true : false} close={true}>
          <FormsShippingRuleCreation setActive={setActive} mutate={createMutate} shipping_id={active} shippingOptions={shippingOptions} template={active?.template || null} loading={createMutateIsLoading} />
        </ShowModal>
      </div>
      {data?.shipping_rules?.length > 0 ? (
        data.shipping_rules.map((item, index) => (
          <div className="shipping-accordion-custom" key={index}>
            <div className="rule-dropdown d-flex justify-content-between align-items-center" onClick={() => setActive((prev) => prev !== item.id && item.id)}>
              {getRuleLabel(item)}
              <RiArrowDownSLine />
            </div>
            {active === item.id && (
              <div className="rule-edit-form">
                <FormsShippingRuleCreation rules={item} mutate={updateMutate} shipping_id={data?.id} shippingOptions={shippingOptions} setActive={setActive} loading={updateLoading} refetch={refetch} />
              </div>
            )}
          </div>
        ))
      ) : (
        <NoDataFound customImage={NoCategorySVG} />
      )}
    </FormWrapper>
  );
};

export default AddShippingRules;
