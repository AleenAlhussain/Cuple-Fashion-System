'use client';
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Table, Badge, Button, FormGroup, Input, Label } from "reactstrap";
import { RiDeleteBinLine, RiEditLine, RiRefreshLine, RiAddLine } from "react-icons/ri";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import request from "@/utils/axiosUtils";
import TableLoader from "@/components/table/TableLoader";
import Pagination from "@/components/table/Pagination";

const AllStoryTable = ({ url, moduleName }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("");

  const { data, isLoading, refetch } = useCustomQuery(
    ["stories", page, statusFilter, mediaTypeFilter],
    () => request({
      url: `${url}?page=${page}&paginate=10${statusFilter ? `&status=${statusFilter}` : ''}${mediaTypeFilter ? `&media_type=${mediaTypeFilter}` : ''}`
    }, router),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data,
    }
  );

  const stories = data?.data || [];
  const meta = data?.meta || {};

  const handleDelete = useCallback(async (id) => {
    if (!confirm("Are you sure you want to delete this story?")) return;

    try {
      await request({ url: `${url}/${id}`, method: "delete" }, router);
      toast.success("Story deleted successfully");
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete story");
    }
  }, [url, router, refetch]);

  const handleToggleStatus = useCallback(async (id) => {
    try {
      await request({ url: `${url}/${id}/status`, method: "put" }, router);
      toast.success("Story status updated");
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
  }, [url, router, refetch]);

  const handleExtend = useCallback(async (id) => {
    try {
      await request({ url: `${url}/${id}/extend`, method: "post" }, router);
      toast.success("Story extended by 24 hours");
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to extend story");
    }
  }, [url, router, refetch]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  const getStatusBadge = (story) => {
    if (!story.is_active) {
      return <Badge color="secondary">Inactive</Badge>;
    }
    if (story.is_expired) {
      return <Badge color="danger">Expired</Badge>;
    }
    return <Badge color="success">Active</Badge>;
  };

  return (
    <Card>
      <div className="title-header option-title d-flex justify-content-between align-items-center">
        <h5>{t("Stories")}</h5>
        <Button color="primary" size="sm" onClick={() => router.push("/story/create")}>
          <RiAddLine className="me-1" /> Add Story
        </Button>
      </div>
      <CardBody>
        {/* Filters */}
        <div className="d-flex gap-3 mb-3 flex-wrap">
          <FormGroup className="mb-0">
            <Label className="me-2">Status:</Label>
            <Input
              type="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "150px", display: "inline-block" }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </Input>
          </FormGroup>
          <FormGroup className="mb-0">
            <Label className="me-2">Media Type:</Label>
            <Input
              type="select"
              value={mediaTypeFilter}
              onChange={(e) => setMediaTypeFilter(e.target.value)}
              style={{ width: "150px", display: "inline-block" }}
            >
              <option value="">All</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </Input>
          </FormGroup>
        </div>

        {isLoading ? (
          <TableLoader />
        ) : stories.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted">No stories found</p>
            <Button color="primary" onClick={() => router.push("/story/create")}>
              Create First Story
            </Button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <Table className="table-hover">
                <thead>
                  <tr>
                    <th>Thumbnail</th>
                    <th>Title</th>
                    <th>Creator</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Expires</th>
                    <th>Product</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stories.map((story) => (
                    <tr key={story.id}>
                      <td>
                        {story.thumbnail_url ? (
                          <img
                            src={story.thumbnail_url}
                            alt={story.title || "Story"}
                            style={{
                              width: 50,
                              height: 50,
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                        ) : story.media_url ? (
                          story.media_type === "video" ? (
                            <div
                              style={{
                                width: 50,
                                height: 50,
                                background: "#333",
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: 12,
                              }}
                            >
                              Video
                            </div>
                          ) : (
                            <img
                              src={story.media_url}
                              alt={story.title || "Story"}
                              style={{
                                width: 50,
                                height: 50,
                                objectFit: "cover",
                                borderRadius: 8,
                              }}
                            />
                          )
                        ) : (
                          <div
                            style={{
                              width: 50,
                              height: 50,
                              background: "#eee",
                              borderRadius: 8,
                            }}
                          />
                        )}
                      </td>
                      <td>{story.title || "-"}</td>
                      <td>
                        <span className="text-capitalize">{story.creator_type}</span>
                        {story.user && (
                          <small className="d-block text-muted">{story.user.name}</small>
                        )}
                      </td>
                      <td>
                        <Badge color={story.media_type === "video" ? "info" : "warning"}>
                          {story.media_type}
                        </Badge>
                      </td>
                      <td>{getStatusBadge(story)}</td>
                      <td>
                        <small>{story.time_remaining || formatDate(story.expires_at)}</small>
                      </td>
                      <td>
                        {story.product ? (
                          <small>{story.product.name}</small>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            color="primary"
                            size="sm"
                            outline
                            onClick={() => router.push(`/story/${story.id}`)}
                            title="Edit"
                          >
                            <RiEditLine />
                          </Button>
                          <Button
                            color="success"
                            size="sm"
                            outline
                            onClick={() => handleExtend(story.id)}
                            title="Extend 24h"
                          >
                            <RiRefreshLine />
                          </Button>
                          <Button
                            color="danger"
                            size="sm"
                            outline
                            onClick={() => handleDelete(story.id)}
                            title="Delete"
                          >
                            <RiDeleteBinLine />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {meta.last_page > 1 && (
              <Pagination
                current_page={meta.current_page || 1}
                last_page={meta.last_page || 1}
                per_page={meta.per_page || 10}
                total={meta.total || 0}
                setPage={setPage}
              />
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default AllStoryTable;
