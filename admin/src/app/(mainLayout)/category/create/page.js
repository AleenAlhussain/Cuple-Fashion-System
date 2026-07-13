"use client";

import { Card, CardBody } from "reactstrap";
import { useTranslation } from "react-i18next";
import CategoryForm from "@/components/category/CategoryForm";
import useCreate from "@/utils/hooks/useCreate";
import { Category } from "@/utils/axiosUtils/API";

export default function CategoryAddPage() {
  const { t } = useTranslation("common");

  const { mutate, isLoading } = useCreate(Category, false, false, false, (res) => {
    if (res?.status === 200 || res?.status === 201) {
        // بعد الإضافة نرجّع المستخدم إلى صفحة الكاتيجوريز
        window.location.href = "/category";
    }
  });

  return (
    <div className="card-spacing">
      <Card>
        <CardBody>
          <h4 className="mb-3">{t("AddCategory")}</h4>
          <CategoryForm loading={isLoading} mutate={mutate} type="product" />
        </CardBody>
      </Card>
    </div>
  );
}
