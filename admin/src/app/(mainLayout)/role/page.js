"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Col, Row, Table } from "reactstrap";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { RiCheckLine, RiCloseLine } from "react-icons/ri";
import request from "@/utils/axiosUtils";
import { user } from "@/utils/axiosUtils/API";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import Loader from "@/components/commonComponent/Loader";
import Pagination from "@/components/table/Pagination";
import Avatar from "@/components/commonComponent/Avatar";
import { placeHolderImage } from "@/data/CommonPath";
import { checkPermission } from "@/components/common/CheckPermissionList";
import AdminSmartSearchBox from "@/components/common/AdminSmartSearchBox";
import { formatAdminRoleLabel } from "@/utils/customFunctions/adminRoles";

const RolePage = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const hasRolePermission = useMemo(() => checkPermission("role.index"), []);

  // State
  const [activeRole, setActiveRole] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [changeRole, setChangeRole] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Fetch role counts
  const { data: roleCounts, refetch: refetchCounts } = useCustomQuery(
    ["role-counts"],
    () => request({ url: `${user}/role-counts` }, router),
    {
      enabled: hasRolePermission,
      refetchOnWindowFocus: false,
      select: (res) =>
        res?.data?.data || {
          all: 0,
          admin: 0,
          customer: 0,
          shop_manager: 0,
          stock_keeper: 0,
          accounting_team: 0,
        },
    }
  );

  // Fetch users with filters
  const { data: usersData, isLoading, refetch: refetchUsers } = useCustomQuery(
    ["users", activeRole, searchTerm, page],
    () =>
      request(
        {
          url: user,
          params: {
            role: activeRole !== "all" ? activeRole : undefined,
            search: searchTerm || undefined,
            paginate: 15,
            page,
          },
        },
        router
      ),
    {
      enabled: hasRolePermission,
      refetchOnWindowFocus: false,
      select: (res) => ({
        users: res?.data?.data || [],
        pagination: {
          current_page: res?.data?.current_page || 1,
          last_page: res?.data?.last_page || 1,
          total: res?.data?.total || 0,
        },
      }),
    }
  );

  const users = usersData?.users || [];
  const pagination = usersData?.pagination || { current_page: 1, last_page: 1, total: 0 };

  // Role tabs configuration
  const roleTabs = [
    { key: "all", label: "All", count: roleCounts?.all || 0 },
    { key: "admin", label: "Administrator", count: roleCounts?.admin || 0 },
    { key: "customer", label: "Customer", count: roleCounts?.customer || 0 },
    { key: "shop_manager", label: "Shop manager", count: roleCounts?.shop_manager || 0 },
    { key: "stock_keeper", label: "Stock keeper", count: roleCounts?.stock_keeper || 0 },
    { key: "accounting_team", label: "Accounting team", count: roleCounts?.accounting_team || 0 },
  ];

  // Role options for change dropdown
  const roleOptions = [
    { value: "admin", label: "Administrator" },
    { value: "customer", label: "Customer" },
    { value: "shop_manager", label: "Shop manager" },
    { value: "stock_keeper", label: "Stock keeper" },
    { value: "accounting_team", label: "Accounting team" },
  ];

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map((u) => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle select single
  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Handle bulk action apply
  const handleBulkApply = async () => {
    if (!selectedUsers.length || !bulkAction) return;

    setLoading(true);
    try {
      await request(
        {
          url: `${user}/bulk-action`,
          method: "post",
          data: {
            ids: selectedUsers,
            action: bulkAction,
          },
        },
        router
      );
      setSelectedUsers([]);
      setBulkAction("");
      refetchUsers();
      refetchCounts();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle change role
  const handleChangeRole = async () => {
    if (!selectedUsers.length || !changeRole) return;

    setLoading(true);
    try {
      await request(
        {
          url: `${user}/bulk-action`,
          method: "post",
          data: {
            ids: selectedUsers,
            action: "change_role",
            role: changeRole,
          },
        },
        router
      );
      setSelectedUsers([]);
      setChangeRole("");
      refetchUsers();
      refetchCounts();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when role changes
  useEffect(() => {
    setPage(1);
    setSelectedUsers([]);
  }, [activeRole]);

  if (!hasRolePermission) {
    return (
      <Col sm="12">
        <div className="card">
          <div className="card-body">
            <div className="p-4 text-center">
              <div className="fw-semibold text-danger fs-4 mb-2">
                Permission Required
              </div>
              <div className="text-muted small fs-6">
                This section is available to administrators only.
              </div>
            </div>
          </div>
        </div>
      </Col>
    );
  }

  return (
    <Col sm="12">
      <div className="card">
        <div className="card-body">
          {/* Role Tabs - WooCommerce Style */}
          <div className="role-tabs mb-3" style={{ borderBottom: "1px solid #c3c4c7" }}>
            <div className="d-flex flex-wrap gap-1">
              {roleTabs.map((tab, index) => (
                <React.Fragment key={tab.key}>
                  <button
                    type="button"
                    className={`btn btn-link p-0 text-decoration-none ${
                      activeRole === tab.key ? "fw-bold" : ""
                    }`}
                    style={{
                      color: activeRole === tab.key ? "#135e96" : "#0073aa",
                      fontSize: "13px",
                    }}
                    onClick={() => setActiveRole(tab.key)}
                  >
                    {tab.label} ({tab.count})
                  </button>
                  {index < roleTabs.length - 1 && (
                    <span className="text-muted" style={{ fontSize: "13px" }}>
                      |
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Actions Row */}
          <Row className="mb-3 align-items-center g-2">
            <Col xs="auto">
              <div className="d-flex align-items-center gap-2">
                {/* Bulk Actions */}
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto", fontSize: "13px" }}
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                >
                  <option value="">{t("BulkActions") || "Bulk actions"}</option>
                  <option value="delete">{t("Delete") || "Delete"}</option>
                  <option value="activate">{t("Activate") || "Activate"}</option>
                  <option value="deactivate">{t("Deactivate") || "Deactivate"}</option>
                </select>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  style={{ fontSize: "13px" }}
                  disabled={loading || !bulkAction || !selectedUsers.length}
                  onClick={handleBulkApply}
                >
                  {t("Apply") || "Apply"}
                </button>

                {/* Change Role */}
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto", fontSize: "13px" }}
                  value={changeRole}
                  onChange={(e) => setChangeRole(e.target.value)}
                >
                  <option value="">{t("ChangeRoleTo") || "Change role to..."}</option>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  style={{ fontSize: "13px" }}
                  disabled={loading || !changeRole || !selectedUsers.length}
                  onClick={handleChangeRole}
                >
                  {t("Change") || "Change"}
                </button>
              </div>
            </Col>

            {/* Pagination Info & Search */}
            <Col className="ms-auto text-end">
              <div className="d-flex align-items-center justify-content-end gap-3">
                <span className="text-muted" style={{ fontSize: "13px" }}>
                  {pagination.total} {t("Items") || "items"}
                </span>

                <AdminSmartSearchBox
                  value={searchText}
                  onChange={setSearchText}
                  onApply={(text) => {
                    setSearchText(text);
                    setSearchTerm(text);
                    setPage(1);
                  }}
                  placeholder={t("SearchUsers") || "Search Users"}
                  loading={isLoading}
                />
              </div>
            </Col>
          </Row>

          {/* Users Table */}
          {isLoading ? (
            <Loader />
          ) : (
            <>
              <div className="table-responsive">
                <Table className="table-hover" style={{ fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f0f0f1" }}>
                      <th style={{ width: "40px" }}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th style={{ cursor: "pointer" }}>{t("Username") || "Username"}</th>
                      <th>{t("Name") || "Name"}</th>
                      <th style={{ cursor: "pointer" }}>{t("Email") || "Email"}</th>
                      <th>{t("Role") || "Role"}</th>
                      <th>{t("Status") || "Status"}</th>
                      <th>{t("Orders") || "Orders"}</th>
                      <th>{t("Created") || "Created"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4 text-muted">
                          {t("NoUsersFound") || "No users found"}
                        </td>
                      </tr>
                    ) : (
                      users.map((userData) => (
                        <tr key={userData.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(userData.id)}
                              onChange={() => handleSelectUser(userData.id)}
                            />
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Avatar
                                data={userData.profile_image_url ? { original_url: userData.profile_image_url } : null}
                                placeHolder={placeHolderImage}
                                name={userData}
                                style={{ width: "32px", height: "32px" }}
                              />
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  router.push(`/user/edit/${userData.id}`);
                                }}
                                style={{ color: "#0073aa", textDecoration: "none" }}
                              >
                                {userData.name?.split(" ")[0]?.toLowerCase() || userData.email?.split("@")[0]}
                              </a>
                            </div>
                          </td>
                          <td>{userData.name || "-"}</td>
                          <td>
                            <a href={`mailto:${userData.email}`} style={{ color: "#0073aa" }}>
                              {userData.email}
                            </a>
                          </td>
                          <td>
                            <span style={{ textTransform: "capitalize" }}>
                              {formatAdminRoleLabel(userData.role)}
                            </span>
                          </td>
                          <td>
                            {userData.is_active ? (
                              <RiCheckLine size={18} color="#00a32a" title="Active" />
                            ) : (
                              <RiCloseLine size={18} color="#d63638" title="Inactive" />
                            )}
                          </td>
                          <td>{userData.orders_count || 0}</td>
                          <td>
                            {userData.created_at
                              ? new Date(userData.created_at).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.last_page > 1 && (
                <div className="d-flex justify-content-center mt-3">
                  <Pagination
                    current_page={pagination.current_page}
                    total={pagination.last_page}
                    setPage={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Col>
  );
};

export default RolePage;
