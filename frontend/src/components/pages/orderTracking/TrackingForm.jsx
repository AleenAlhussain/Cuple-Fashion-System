"use client";
import Btn from "@/elements/buttons/Btn";
import { Col } from "reactstrap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DETECTION_LABELS, detectInputType, formatDateTime } from "@/utils/tracking/flow";

const getApiBaseUrl = () => {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!raw) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return raw;
};

const TrackingForm = () => {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";
  const autoSearchDone = useRef(false);
  const [queryValue, setQueryValue] = useState("");
  const [detectedType, setDetectedType] = useState(null);
  const [inputError, setInputError] = useState("");
  const [resolverMessage, setResolverMessage] = useState("");
  const [resolverChoices, setResolverChoices] = useState([]);
  const [resolverHasMore, setResolverHasMore] = useState(false);
  const [resolverLoading, setResolverLoading] = useState(false);
  const [resolverErrorCode, setResolverErrorCode] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [resolvedOrder, setResolvedOrder] = useState(null);
  const [showEtaHint, setShowEtaHint] = useState(false);

  const detectionLabel = useMemo(() => {
    if (!detectedType) return "";
    const label = DETECTION_LABELS[detectedType];
    if (!label) return "";
    return locale === "ar" ? label.ar : label.en;
  }, [detectedType, locale]);

  const resetResolverState = useCallback(() => {
    setResolverErrorCode("");
    setResolverMessage("");
    setResolverChoices([]);
    setResolverHasMore(false);
  }, []);

  const fetchTracking = useCallback(
    async (awb) => {
      const clean = (awb || "").trim();
      if (!clean) return null;
      const base = getApiBaseUrl();
      const url = `${base}/website/shipping/aramex/track?awb=${encodeURIComponent(clean)}&locale=${locale}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Tracking request failed");
      }
      const json = await response.json();
      if (!json?.success) {
        return null;
      }
      return json.data ?? null;
    },
    [locale]
  );

  const handleTrack = useCallback(
    async (awb) => {
      setTrackingError("");
      setTrackingResult(null);
      setTrackingLoading(true);
      setShowEtaHint(false);
      try {
        const result = await fetchTracking(awb);
        if (!result) {
          setTrackingError(t("TrackingNoResult"));
          return null;
        }
        setTrackingResult(result);
        return result;
      } catch (error) {
        setTrackingError(t("TrackingFetchError"));
        return null;
      } finally {
        setTrackingLoading(false);
      }
    },
    [fetchTracking, t]
  );

  const handleResolve = useCallback(
    async (event) => {
      event.preventDefault();
      setInputError("");
      resetResolverState();
      setTrackingResult(null);
      setTrackingError("");
      setResolvedOrder(null);
      setShowEtaHint(false);

      const trimmed = queryValue.trim();
      const detection = detectInputType(trimmed);
      setDetectedType(detection);

      if (!trimmed || !detection || detection === "unknown") {
        setInputError(t("TrackingInvalidInput"));
        return;
      }

      try {
        setResolverLoading(true);
        const base = getApiBaseUrl();
        const url = `${base}/website/track/resolve?query=${encodeURIComponent(trimmed)}&locale=${locale}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
        const payload = await response.json();

        if (!response.ok || payload.success === false) {
          setResolverErrorCode(payload?.code || "");
          setInputError(payload?.message || t("TrackingResolverError"));
          return;
        }

        const data = payload.data ?? {};
        if (data.type === "mobile") {
          setResolverChoices(data.choices ?? []);
          setResolverMessage(data.message || t("MobileVerificationPrompt"));
          setResolverHasMore(Boolean(data.has_more));
          return;
        }

        const awb = data.awb;
        if (!awb) {
          setInputError(t("TrackingResolverError"));
          return;
        }

        setResolvedOrder({
          order_number: data.order_number ?? null,
          order_id: data.order_id ?? null,
          awb,
        });
        await handleTrack(awb);
      } catch (error) {
        setResolverErrorCode("");
        setInputError(t("TrackingResolverError"));
      } finally {
        setResolverLoading(false);
      }
    },
    [handleTrack, queryValue, locale, resetResolverState, t]
  );

  // Auto-fill and auto-search from URL params (awb or order_number)
  useEffect(() => {
    if (autoSearchDone.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    // Check for ?awb= param first (from WhatsApp tracking link)
    const rawAwb = params.get("awb");
    if (rawAwb) {
      autoSearchDone.current = true;
      const cleanAwb = rawAwb.replace(/^\/+/, "").trim().replace(/\D/g, "");
      setQueryValue(cleanAwb);
      setDetectedType(detectInputType(cleanAwb));
      if (cleanAwb.length >= 8) {
        handleTrack(cleanAwb);
      }
      return;
    }

    // Fallback: check for ?order_number= param
    const orderNumber = params.get("order_number");
    if (!orderNumber) return;
    autoSearchDone.current = true;
    setQueryValue(orderNumber);
    setDetectedType(detectInputType(orderNumber));
    const trimmed = orderNumber.trim();
    const detection = detectInputType(trimmed);
    if (!trimmed || !detection || detection === "unknown") return;
    (async () => {
      try {
        setResolverLoading(true);
        const base = getApiBaseUrl();
        const url = `${base}/website/track/resolve?query=${encodeURIComponent(trimmed)}&locale=${locale}`;
        const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
        const payload = await response.json();
        if (!response.ok || payload.success === false) {
          setResolverErrorCode(payload?.code || "");
          setInputError(payload?.message || t("TrackingResolverError"));
          return;
        }
        const data = payload.data ?? {};
        if (data.type === "mobile") {
          setResolverChoices(data.choices ?? []);
          setResolverMessage(data.message || t("MobileVerificationPrompt"));
          setResolverHasMore(Boolean(data.has_more));
          return;
        }
        const awb = data.awb;
        if (!awb) {
          setInputError(t("TrackingResolverError"));
          return;
        }
        setResolvedOrder({ order_number: data.order_number ?? null, order_id: data.order_id ?? null, awb });
        await handleTrack(awb);
      } catch (error) {
        setInputError(t("TrackingResolverError"));
      } finally {
        setResolverLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoiceSelect = useCallback(
    async (choice) => {
      const awb = choice?.awb;
      if (!awb) return;
      resetResolverState();
      setResolverLoading(true);
      setTrackingResult(null);
      setTrackingError("");
      setShowEtaHint(false);
      setResolvedOrder({
        order_number: choice?.order_number ?? null,
        order_id: choice?.order_id ?? null,
        awb,
      });
      try {
        await handleTrack(awb);
      } finally {
        setResolverLoading(false);
      }
    },
    [handleTrack, resetResolverState]
  );

  const lastUpdateValue = useMemo(() => {
    if (!trackingResult) return null;
    return (
      trackingResult.timeline?.[0]?.date ||
      trackingResult.customer_status?.occurred_at ||
      null
    );
  }, [trackingResult]);

  const formatEtaHint = useCallback(() => {
    if (!trackingResult) return "";
    if (lastUpdateValue) {
      const statusMessage = trackingResult.customer_status?.message;
      return `${t("EtaHintPrefix")} ${formatDateTime(lastUpdateValue)}${
        statusMessage ? ` · ${statusMessage}` : ""
      }`;
    }
    return t("EtaHintFallback");
  }, [lastUpdateValue, t, trackingResult]);

  const timeline = useMemo(
    () => (Array.isArray(trackingResult?.timeline) ? trackingResult.timeline : []),
    [trackingResult]
  );

  const renderChoiceCards = () => {
    if (!resolverChoices.length) return null;
    return (
      <div className="tracking-choice-list">
        {resolverMessage && <p className="tracking-choice-note">{resolverMessage}</p>}
        {resolverChoices.map((choice) => (
          <button
            key={choice.order_id}
            type="button"
            className="tracking-choice-item"
            onClick={() => handleChoiceSelect(choice)}
          >
            <div className="tracking-choice-row">
              <strong>#{choice.order_number}</strong>
              <span>
                {choice.currency} {choice.total}
              </span>
            </div>
            <p className="tracking-choice-meta">
              {choice.date}
              {choice.masked_address ? ` · ${choice.masked_address}` : ""}
            </p>
          </button>
        ))}
        {resolverHasMore && <p className="tracking-choice-note">{t("TrackingResolverChoicesHint")}</p>}
      </div>
    );
  };

  const renderActionButtons = (stage) => {
    const delivered = stage === "DELIVERED";
    const inTransit = ["IN_TRANSIT", "OUT_FOR_DELIVERY", "PROCESSING"].includes(stage);
    if (!delivered && !inTransit) return null;
    const orderNumber = resolvedOrder?.order_number;
    const baseLink = orderNumber ? `/account/order/details/${orderNumber}` : "/account/orders";

    return (
      <div className="tracking-card-actions">
        {delivered && orderNumber && (
          <>
            <a className="tracking-action-btn" href={`${baseLink}#refund`}>
              {t("refundCta")}
            </a>
            <a className="tracking-action-btn" href={`${baseLink}#exchange`}>
              {t("exchangeCta")}
            </a>
          </>
        )}
        <a className="tracking-action-btn" href="/contact-us">
          {t("ContactCustomerService")}
        </a>
        {inTransit && (
          <div className="tracking-eta-group">
            <button
              type="button"
              className="tracking-action-btn"
              onClick={() => setShowEtaHint((prev) => !prev)}
            >
              {t("EtaButtonLabel")}
            </button>
            {showEtaHint && <p className="tracking-eta-hint">{formatEtaHint()}</p>}
          </div>
        )}
      </div>
    );
  };

  const renderTrackingCard = () => {
    if (!trackingResult || !trackingResult.customer_status) return null;
    const stage = trackingResult.customer_status.stage;
    const lastUpdateLabel = lastUpdateValue
      ? formatDateTime(lastUpdateValue)
      : t("TrackingLastUpdateUnavailable");

    return (
      <div className="tracking-card">
        <div className="tracking-card__header">
          <h5 className="mb-1">{t("TrackingResultTitle")}</h5>
        </div>
        <div className="tracking-card__body">
          <div className="mb-2">
            <strong>{t("TrackingNumberLabel")}:</strong>{" "}
            {trackingResult.tracking_payload?.WaybillNumber || resolvedOrder?.awb}
          </div>
          {resolvedOrder?.order_number && (
            <div className="mb-2">
              <strong>{t("OrderNumber")}:</strong> {resolvedOrder.order_number}
            </div>
          )}
          <div className="mb-2">
            <strong>{t("TrackingStatusLabel")}:</strong>{" "}
            {trackingResult.customer_status.title}
          </div>
          <p className="text-muted mb-2">{trackingResult.customer_status.message}</p>
          {trackingResult.is_fallback && (
            <p className="text-warning mb-2">{t("TrackingFallbackInfo")}</p>
          )}
          <div className="tracking-card__details">
            <div>
              <strong>{t("TrackingCarrierCodeLabel")}:</strong>{" "}
              {trackingResult.aramex_status_code ?? "-"}
            </div>
            <div>
              <strong>{t("TrackingCarrierStatusLabel")}:</strong>{" "}
              {trackingResult.aramex?.name ?? "-"}
            </div>
            <div>
              <strong>{t("TrackingCarrierLocationLabel")}:</strong>{" "}
              {trackingResult.aramex?.location ?? "-"}
            </div>
          </div>
          <div>
            <strong>{t("TrackingLastSync")}:</strong>{" "}
            {lastUpdateLabel}
          </div>
          {trackingResult.tracking_payload?.EstimatedDeliveryDate && (
            <div>
              <strong>{t("TrackingEstimatedDeliveryLabel")}:</strong>{" "}
              {formatDateTime(trackingResult.tracking_payload.EstimatedDeliveryDate)}
            </div>
          )}
          {renderActionButtons(stage)}
        </div>
        <div className="tracking-timeline">
          <h6 className="fw-bold">{t("TrackingTimelineTitle")}</h6>
          {timeline.length === 0 && <p className="text-muted">{t("TrackingTimelineEmpty")}</p>}
          {timeline.map((event, index) => (
            <div key={`${event.date ?? ""}-${index}`} className="tracking-timeline-item">
              <div className="d-flex justify-content-between">
                <span className="text-muted small">{formatDateTime(event.date)}</span>
                <span className="text-muted small">
                  {event.location ?? t("TrackingLocationLabel")}
                </span>
              </div>
              <p className="mb-1">{event.status_description ?? event.status}</p>
              {event.remarks && <small className="text-muted">{event.remarks}</small>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <form className="row g-3" onSubmit={handleResolve}>
        <Col xs="12">
          <div className="form-floating theme-form-floating log-in-form">
            <input
              className={`form-control ${inputError ? "is-invalid" : ""}`}
              id="tracking_query"
              name="tracking_query"
              type="text"
              value={queryValue}
              onChange={(event) => {
                setQueryValue(event.target.value);
                setDetectedType(detectInputType(event.target.value));
              }}
              placeholder={t("TrackingNumberPlaceholder")}
              required
            />
            <label htmlFor="tracking_query">{t("TrackingNumberLabel")}</label>
          </div>
          {detectionLabel && <p className="text-muted small mb-1">{detectionLabel}</p>}
          {inputError && <div className="invalid-feedback d-block">{inputError}</div>}
        </Col>
        <Col xs="12">
          <Btn
            type="submit"
            className="btn-solid w-100"
            title={resolverLoading ? t("TrackingResolverLoading") : t("TrackButton")}
            loading={resolverLoading}
          />
        </Col>
      </form>
      {resolverLoading && <p className="text-muted small mt-2">{t("TrackingResolverLoading")}</p>}
      {resolverErrorCode === "order_missing_tracking" && (
        <div className="tracking-error-cta">
          <button type="button" className="tracking-action-btn tracking-action-btn--disabled" disabled>
            {t("TrackingTryAgainLater")}
          </button>
          <a className="tracking-action-btn" href="/contact-us">
            {t("ContactCustomerService")}
          </a>
        </div>
      )}
      {renderChoiceCards()}
      {trackingLoading && <p className="text-muted small mt-2">{t("TrackingLoadingMessage")}</p>}
      {trackingError && <p className="text-danger small mt-2">{trackingError}</p>}
      {renderTrackingCard()}
    </>
  );
};

export default TrackingForm;
