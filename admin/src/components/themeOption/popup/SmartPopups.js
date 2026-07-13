'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Table, Badge, Button, Input, FormGroup, Label } from "reactstrap";
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { toast } from "react-toastify";
import request from "@/utils/axiosUtils";
import { PopupAPI } from "@/utils/axiosUtils/API";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import Loader from "@/components/commonComponent/Loader";

const SmartPopups = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Fetch popups
  const { data: popupsData, isLoading, refetch } = useCustomQuery(
    ["admin-popups"],
    () => request({ url: PopupAPI, params: { paginate: 50 } }, router),
    { refetchOnWindowFocus: false, select: (res) => res?.data?.data || [] }
  );

  const popups = popupsData || [];

  // Filter popups by search
  const filteredPopups = popups.filter(popup =>
    popup.title?.toLowerCase().includes(search.toLowerCase()) ||
    popup.type?.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle status
  const handleToggleStatus = async (popup) => {
    try {
      await request({
        url: `${PopupAPI}/${popup.id}/status`,
        method: 'put'
      }, router);
      toast.success(`Popup ${popup.is_active ? 'disabled' : 'enabled'} successfully`);
      refetch();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // Delete popup
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this popup?")) return;
    try {
      await request({
        url: `${PopupAPI}/${id}`,
        method: 'delete'
      }, router);
      toast.success("Popup deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete popup");
    }
  };

  // Get badge color by type
  const getTypeBadge = (type) => {
    const colors = {
      collection: 'primary',
      offer: 'warning',
      coupon: 'success',
      newsletter: 'info'
    };
    return colors[type] || 'secondary';
  };

  // Get frequency label
  const getFrequencyLabel = (freq) => {
    const labels = {
      once: 'Once Only',
      every_visit: 'Every Visit',
      once_per_session: 'Per Session',
      once_per_day: 'Per Day'
    };
    return labels[freq] || freq;
  };

  if (isLoading) return <Loader />;

  return (
    <div className="smart-popups-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">{t("SmartPopups") || "Smart Popups"}</h5>
        <Button
          color="primary"
          size="sm"
          onClick={() => router.push("/popup/create")}
        >
          <RiAddLine className="me-1" /> {t("AddPopup") || "Add Popup"}
        </Button>
      </div>

      <FormGroup className="mb-3">
        <Input
          type="text"
          placeholder={t("SearchPopups") || "Search popups..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </FormGroup>

      {filteredPopups.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p>{t("NoPopupsFound") || "No popups found"}</p>
          <Button
            color="primary"
            outline
            size="sm"
            onClick={() => router.push("/popup/create")}
          >
            {t("CreateFirstPopup") || "Create your first popup"}
          </Button>
        </div>
      ) : (
        <div className="table-responsive">
          <Table className="table-hover">
            <thead>
              <tr>
                <th>{t("Title") || "Title"}</th>
                <th>{t("Type") || "Type"}</th>
                <th>{t("Frequency") || "Frequency"}</th>
                <th>{t("Priority") || "Priority"}</th>
                <th>{t("Status") || "Status"}</th>
                <th className="text-end">{t("Actions") || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPopups.map((popup) => (
                <tr key={popup.id}>
                  <td>
                    <strong>{popup.title}</strong>
                    {popup.coupon_code && (
                      <small className="d-block text-muted">
                        Code: {popup.coupon_code}
                      </small>
                    )}
                  </td>
                  <td>
                    <Badge color={getTypeBadge(popup.type)} className="text-capitalize">
                      {popup.type}
                    </Badge>
                  </td>
                  <td>
                    <small>{getFrequencyLabel(popup.display_frequency)}</small>
                    <small className="d-block text-muted">
                      Delay: {popup.delay_seconds}s
                    </small>
                  </td>
                  <td>
                    <Badge color="light" className="text-dark">
                      {popup.priority}
                    </Badge>
                  </td>
                  <td>
                    <Badge color={popup.is_active ? "success" : "secondary"}>
                      {popup.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="text-end">
                    <Button
                      color="link"
                      size="sm"
                      className="p-1"
                      title={popup.is_active ? "Disable" : "Enable"}
                      onClick={() => handleToggleStatus(popup)}
                    >
                      {popup.is_active ? (
                        <RiEyeLine size={18} className="text-success" />
                      ) : (
                        <RiEyeOffLine size={18} className="text-muted" />
                      )}
                    </Button>
                    <Button
                      color="link"
                      size="sm"
                      className="p-1"
                      title="Edit"
                      onClick={() => router.push(`/popup/edit/${popup.id}`)}
                    >
                      <RiEditLine size={18} className="text-primary" />
                    </Button>
                    <Button
                      color="link"
                      size="sm"
                      className="p-1"
                      title="Delete"
                      onClick={() => handleDelete(popup.id)}
                    >
                      <RiDeleteBinLine size={18} className="text-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <div className="mt-4 p-3 bg-light rounded">
        <h6>{t("PopupTypes") || "Popup Types"}:</h6>
        <ul className="mb-0 small">
          <li><strong>Collection:</strong> {t("CollectionDesc") || "Promote new collections"}</li>
          <li><strong>Offer:</strong> {t("OfferDesc") || "Display special offers/sales"}</li>
          <li><strong>Coupon:</strong> {t("CouponDesc") || "Show coupon codes (copy to clipboard)"}</li>
          <li><strong>Newsletter:</strong> {t("NewsletterDesc") || "Email subscription form"}</li>
        </ul>
      </div>
    </div>
  );
};

export default SmartPopups;
