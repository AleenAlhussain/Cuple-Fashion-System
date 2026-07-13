import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { RiMailLine, RiKey2Line, RiCheckboxCircleLine, RiShieldKeyholeLine, RiMapPinLine, RiDownload2Line } from "react-icons/ri";
import { Input, Label, FormGroup, Card, CardBody } from "reactstrap";
import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import Loader from "../commonComponent/Loader";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";
import request from "@/utils/axiosUtils";
import { user, UserAddressesAPI, UserAddressesExportAPI, UsersAddressesExportAPI } from "@/utils/axiosUtils/API";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import ShowModal from "../../elements/alerts&Modals/Modal";
import Btn from "../../elements/buttons/Btn";
import AdminSmartSearchBox from "@/components/common/AdminSmartSearchBox";
import { formatAdminRoleLabel } from "@/utils/customFunctions/adminRoles";

const AllUsersTable = ({ data, roleOptions = [], isCheck, setIsCheck, refetch, search, setSearch, fetchStatus, ...props }) => {
  const { t } = useTranslation("common");
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);
  const router = useRouter();
  const [bulkAction, setBulkAction] = useState("");
  const [bulkRole, setBulkRole] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Password reset modal state
  const [resetModal, setResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetMode, setResetMode] = useState("email"); // "email" or "direct"
  const [newPassword, setNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [addressesModal, setAddressesModal] = useState(false);
  const [modalAddresses, setModalAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState("");
  const [activeAddressUser, setActiveAddressUser] = useState(null);
  const downloadFile = async (urlPath, fallbackFilename) => {
    try {
      const response = await request(
        {
          url: urlPath,
          method: "get",
          responseType: "blob",
          headers: { Accept: "*/*" },
        },
        router
      );
      const disposition = response?.headers?.["content-disposition"] ?? "";
      const filenameMatch = disposition.match(/filename=("[^"]+"|[^;]+)/i);
      const filename = filenameMatch
        ? filenameMatch[1].replace(/^"|"$/g, "")
        : fallbackFilename;

      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename || fallbackFilename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export download failed:", error);
    }
  };

  useEffect(() => {
    if (search !== undefined) {
      setSearchText(search || "");
    }
  }, [search]);

  const fetchAddresses = async (userId) => {
    setAddressesLoading(true);
    setAddressesError("");
    try {
      const response = await request(
        { url: UserAddressesAPI(userId), method: "get" },
        router
      );
      setModalAddresses(response?.data?.data || []);
    } catch (error) {
      console.error("Failed to load user addresses:", error);
      setAddressesError("Unable to load addresses at the moment.");
    } finally {
      setAddressesLoading(false);
    }
  };

  const handleAddressesClick = (userData) => {
    setActiveAddressUser(userData);
    setAddressesModal(true);
    setModalAddresses([]);
    setAddressesError("");
    fetchAddresses(userData.id);
  };

  const handleCloseAddressesModal = () => {
    setAddressesModal(false);
    setActiveAddressUser(null);
    setModalAddresses([]);
    setAddressesError("");
  };

  const exportUserAddresses = (format) => {
    if (!activeAddressUser) return;
    const url = `${UserAddressesExportAPI(activeAddressUser.id)}?format=${format}`;
    downloadFile(url, `user_${activeAddressUser.id}_addresses.${format === "csv" ? "csv" : "xlsx"}`);
  };

  const exportAllAddresses = (format) => {
    const url = `${UsersAddressesExportAPI}?format=${format}`;
    downloadFile(url, `users_addresses.${format === "csv" ? "csv" : "xlsx"}`);
  };

  const handleResetPasswordClick = (userData) => {
    setSelectedUser(userData);
    setResetSuccess(false);
    setResetMode("email");
    setNewPassword("");
    setSuccessMessage("");
    setResetModal(true);
  };

  const handleSendResetLink = async () => {
    setResetLoading(true);
    try {
      await request(
        { url: `${user}/${selectedUser.id}/reset-password`, method: "put" },
        router
      );
      setSuccessMessage(`Password reset link sent to ${selectedUser.email}`);
      setResetSuccess(true);
    } catch (error) {
      console.error("Failed to send reset link:", error);
      alert("Failed to send reset link. Please check mail configuration.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleDirectReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    setResetLoading(true);
    try {
      await request(
        { url: `${user}/${selectedUser.id}/reset-password-direct`, method: "put", data: { password: newPassword } },
        router
      );
      setSuccessMessage("Password has been reset successfully");
      setResetSuccess(true);
      setNewPassword("");
    } catch (error) {
      console.error("Failed to reset password:", error);
      alert("Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  const headerObj = {
    checkBox: true,
    isOption: edit == false && destroy == false ? false : true,
    noEdit: edit ? false : true,
    disableRowClick: true,
    isSerialNo: false,
    optionHead: { title: "Action" },
    column: [
      { title: "Avatar", apiKey: "profile_image", type: "image", class: "sm-width", NameWithRound: true },
      { title: "Name", apiKey: "name", sorting: true, sortBy: "desc" },
      { title: "Email", apiKey: "email", sorting: true, sortBy: "desc" },
      {
        title: "Role", apiKey: "role", render: (row) => {
          const roleClass = row.role === "admin"
            ? "bg-danger"
            : row.role === "shop_manager"
              ? "bg-warning text-dark"
              : row.role === "stock_keeper"
                ? "bg-success"
                : row.role === "accounting_team"
                  ? "bg-primary"
              : "bg-info";
          const roleLabel = formatAdminRoleLabel(row.role);
          return <span className={`badge ${roleClass}`}>{roleLabel}</span>;
        }
      },
      { title: "CreateAt", apiKey: "created_at", sorting: true, sortBy: "desc", type: "date" },
      { title: "Status", apiKey: "is_active", type: "switch", url: user },
      {
        title: "Addresses",
        apiKey: "id",
        render: (rowData) => (
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            onClick={(e) => {
              e.stopPropagation();
              handleAddressesClick(rowData);
            }}
          >
            <RiMapPinLine className="me-1" />
            {t("Addresses")}
          </button>
        ),
      },
      {
        title: "Reset",
        apiKey: "id",
        render: (rowData) => (
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={(e) => {
              e.stopPropagation();
              handleResetPasswordClick(rowData);
            }}
            title="Reset Password"
            style={{ borderRadius: "6px" }}
          >
            <RiKey2Line size={16} />
          </button>
        ),
      },
    ],
    data: data || [],
  };

  const handleBulkApply = async () => {
    if (!isCheck?.length || !bulkAction) return;
    setBulkLoading(true);
    try {
      if (bulkAction === "trash") {
        await Promise.all(isCheck.map((id) => request({ url: `${user}/${id}`, method: "delete" }, router)));
      } else if (bulkAction === "change_role") {
        if (!bulkRole) return;
        await request(
          {
            url: `${user}/bulk-action`,
            method: "post",
            data: { ids: isCheck, action: "change_role", role: bulkRole },
          },
          router
        );
      } else if (bulkAction === "password_reset") {
        const res = await request(
          {
            url: `${user}/bulk-action`,
            method: "post",
            data: { ids: isCheck, action: "password_reset" },
          },
          router
        );
        const sent = res?.data?.sent;
        const failed = res?.data?.failed;
        const message = res?.message || "Password reset links sent.";
        ToastNotification(
          failed ? "warn" : "success",
          failed ? `${message} Failed: ${failed}` : message
        );
      }
      setIsCheck && setIsCheck([]);
      refetch && refetch();
    } catch (error) {
      console.error(error);
    } finally {
      setBulkLoading(false);
      setBulkAction("");
      setBulkRole("");
    }
  };

  if (!data) return <Loader />;
  return (
    <>
      <div className="mb-3">
        <AdminSmartSearchBox
          value={searchText}
          onChange={setSearchText}
          onApply={(text) => {
            setSearchText(text);
            setSearch && setSearch(text);
          }}
          placeholder={t("SearchUsers") || "Search users"}
          loading={fetchStatus === "fetching"}
        />
      </div>
      <div className="mb-3 d-flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm export-btn"
          onClick={() => exportAllAddresses("xlsx")}
        >
          <RiDownload2Line className="me-1" />
          {t("ExportUsersAddresses") || "Export Users + Addresses"} (XLSX)
        </button>

        <button
          type="button"
          className="btn btn-sm export-btn"
          onClick={() => exportAllAddresses("csv")}
        >
          {t("ExportUsersAddresses") || "Export Users + Addresses"} (CSV)
        </button>

      </div>
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <select className="form-select form-select-sm w-auto" value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
          <option value="">Bulk actions</option>
          <option value="trash">Move to trash</option>
          <option value="change_role">Change role to</option>
          <option value="password_reset">Send password reset</option>
        </select>
        {bulkAction === "change_role" && (
          <select className="form-select form-select-sm w-auto" value={bulkRole} onChange={(e) => setBulkRole(e.target.value)}>
            <option value="">Select role</option>
            {(roleOptions || []).map((role) => (
              <option value={role.id} key={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className="btn btn-theme btn-sm"
          disabled={
            bulkLoading ||
            !bulkAction ||
            !isCheck?.length ||
            (bulkAction === "change_role" && !bulkRole)
          }
          onClick={handleBulkApply}
        >
          {bulkLoading ? "Applying..." : "Apply Bulk Action"}
        </button>
      </div>
      <ShowTable {...props} headerData={headerObj} isCheck={isCheck} setIsCheck={setIsCheck} refetch={refetch} />

      {/* Password Reset Modal */}
      <ShowModal
        open={resetModal}
        close={true}
        setModal={setResetModal}
        title=""
        buttons={
          resetSuccess ? (
            <Btn title={t("Done") || "Done"} onClick={() => setResetModal(false)} className="btn-theme btn-md fw-bold" />
          ) : null
        }
      >
        <div className="reset-password-content">
          {resetSuccess ? (
            <div className="text-center py-4">
              <div className="mb-3">
                <div style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto"
                }}>
                  <RiCheckboxCircleLine size={40} color="#fff" />
                </div>
              </div>
              <h4 className="mb-2" style={{ color: "#333" }}>Success!</h4>
              <p className="text-muted mb-0">{successMessage}</p>
              {resetMode === "email" && (
                <p className="text-muted small mt-2">
                  The link will expire in 60 minutes.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* User Info Header */}
              <div className="text-center mb-4">
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #c9a86c 0%, #b8956a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 15px"
                }}>
                  <RiShieldKeyholeLine size={28} color="#fff" />
                </div>
                <h5 className="mb-1" style={{ color: "#333" }}>Reset Password</h5>
                <p className="text-muted small mb-0">
                  <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
                </p>
              </div>

              {/* Option Cards */}
              <div className="row g-3">
                {/* Send Email Card */}
                <div className="col-12">
                  <Card
                    className={`cursor-pointer ${resetMode === "email" ? "border-primary" : ""}`}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.2s",
                      border: resetMode === "email" ? "2px solid #c9a86c" : "1px solid #e0e0e0"
                    }}
                    onClick={() => setResetMode("email")}
                  >
                    <CardBody className="d-flex align-items-center p-3">
                      <div style={{
                        width: "45px",
                        height: "45px",
                        borderRadius: "10px",
                        background: resetMode === "email" ? "#c9a86c" : "#f5f5f5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: "15px"
                      }}>
                        <RiMailLine size={22} color={resetMode === "email" ? "#fff" : "#666"} />
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1" style={{ fontSize: "14px", fontWeight: "600" }}>Send Reset Link</h6>
                        <p className="mb-0 text-muted" style={{ fontSize: "12px" }}>
                          Email a secure link to reset password
                        </p>
                      </div>
                      <div>
                        <input
                          type="radio"
                          checked={resetMode === "email"}
                          onChange={() => setResetMode("email")}
                          style={{ width: "18px", height: "18px", accentColor: "#c9a86c" }}
                        />
                      </div>
                    </CardBody>
                  </Card>
                </div>

                {/* Direct Reset Card */}
                <div className="col-12">
                  <Card
                    className={`cursor-pointer ${resetMode === "direct" ? "border-primary" : ""}`}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.2s",
                      border: resetMode === "direct" ? "2px solid #c9a86c" : "1px solid #e0e0e0"
                    }}
                    onClick={() => setResetMode("direct")}
                  >
                    <CardBody className="p-3">
                      <div className="d-flex align-items-center">
                        <div style={{
                          width: "45px",
                          height: "45px",
                          borderRadius: "10px",
                          background: resetMode === "direct" ? "#c9a86c" : "#f5f5f5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: "15px"
                        }}>
                          <RiKey2Line size={22} color={resetMode === "direct" ? "#fff" : "#666"} />
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1" style={{ fontSize: "14px", fontWeight: "600" }}>Set New Password</h6>
                          <p className="mb-0 text-muted" style={{ fontSize: "12px" }}>
                            Directly set a password (emergency only)
                          </p>
                        </div>
                        <div>
                          <input
                            type="radio"
                            checked={resetMode === "direct"}
                            onChange={() => setResetMode("direct")}
                            style={{ width: "18px", height: "18px", accentColor: "#c9a86c" }}
                          />
                        </div>
                      </div>

                      {/* Password Input - Show only when direct mode is selected */}
                      {resetMode === "direct" && (
                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid #eee" }}>
                          <FormGroup className="mb-0">
                            <Label className="small fw-semibold">New Password</Label>
                            <Input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password (min 6 characters)"
                              minLength={6}
                              style={{ borderRadius: "8px" }}
                            />
                          </FormGroup>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex gap-2 mt-4">
                <Btn
                  title={t("Cancel") || "Cancel"}
                  onClick={() => setResetModal(false)}
                  className="btn-outline flex-grow-1"
                  style={{ borderRadius: "8px" }}
                />
                {resetMode === "email" ? (
                  <Btn
                    title={resetLoading ? "Sending..." : "Send Reset Link"}
                    onClick={handleSendResetLink}
                    className="btn-theme flex-grow-1"
                    disabled={resetLoading}
                    style={{ borderRadius: "8px" }}
                  />
                ) : (
                  <Btn
                    title={resetLoading ? "Resetting..." : "Reset Password"}
                    onClick={handleDirectReset}
                    className="btn-theme flex-grow-1"
                    disabled={resetLoading || !newPassword || newPassword.length < 6}
                    style={{ borderRadius: "8px" }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </ShowModal>
      <ShowModal
        open={addressesModal}
        setModal={handleCloseAddressesModal}
        title="UserAddresses"
        modalAttr={{ className: "user-addresses-modal" }}

        buttons={
          <div className="d-flex flex-column gap-2 w-100">
            <div className="d-flex gap-2 justify-content-center">
              <button type="button" className="btn btn-sm export-btn flex-grow-1"
                onClick={() => exportUserAddresses("csv")} disabled={!activeAddressUser}>
                {t("ExportUserAddresses") || "Export User Addresses"} (CSV)
              </button>

              <button type="button" className="btn btn-sm export-btn flex-grow-1"
                onClick={() => exportUserAddresses("xlsx")} disabled={!activeAddressUser}>
                {t("ExportUserAddresses") || "Export User Addresses"} (XLSX)
              </button>
            </div>

            <div className="d-flex justify-content-center">
              <button type="button" className="btn btn-sm btn-outline-secondary" style={{ minWidth: 160 }}
                onClick={handleCloseAddressesModal}>
                {t("Close") || "Close"}
              </button>
            </div>
          </div>
        }



      >
        <div>
          {addressesLoading ? (
            <div className="text-center py-4">
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              {t("Loading")}...
            </div>
          ) : addressesError ? (
            <div className="text-danger text-center py-4">{addressesError}</div>
          ) : !modalAddresses?.length ? (
            <div className="text-center text-muted py-4">{t("NoAddressesForUser") || "No addresses found for this user."}</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>{t("Title")}</th>
                    <th>{t("Address")}</th>
                    <th>{t("Country")}</th>
                    <th>{t("Phone")}</th>
                    <th>{t("Status")}</th>
                    <th>{t("CreateAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {modalAddresses.map((address) => (
                    <tr key={address.id}>
                      <td>{address.title || "-"}</td>
                      <td>{address.address_line || address.formatted_address || "-"}</td>
                      <td>
                        {[address.country_name, address.state_name, address.city_name]
                          .filter(Boolean)
                          .map((label, idx) => (
                            <div key={idx}>{label}</div>
                          ))}
                      </td>
                      <td>
                        {(address.phone_code || address.phone) && `${address.phone_code ?? ""} ${address.phone ?? ""}`.trim()
                          ? `${address.phone_code ?? ""} ${address.phone ?? ""}`.trim()
                          : "-"}
                      </td>
                      <td>
                        {address.is_default_shipping && (
                          <span className="badge bg-success me-1">{t("DefaultShipping")}</span>
                        )}
                        {address.is_default_billing && (
                          <span className="badge bg-info">{t("DefaultBilling")}</span>
                        )}
                        {!address.is_default_shipping && !address.is_default_billing && "-"}
                      </td>
                      <td>{address.created_at ? new Date(address.created_at).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ShowModal>
    </>
  );
};

export default TableWrapper(AllUsersTable);
