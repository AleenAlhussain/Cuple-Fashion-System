"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Modal } from "reactstrap";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { RiCloseLine, RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import { useStoryState } from "@/states";
import useAxios from "@/utils/api/helpers/useAxios";
import { useTranslation } from "react-i18next";
import styles from "./StoryViewer.module.scss";

const StoryViewer = () => {
  const axios = useAxios();
  const { t } = useTranslation("common");
  const videoRef = useRef(null);
  const progressTimerRef = useRef(null);

  const {
    storyGroups,
    currentGroupIndex,
    currentStoryIndex,
    currentStories,
    setCurrentStories,
    closeViewer,
    nextStory,
    prevStory,
    markViewed,
    isViewerOpen,
  } = useStoryState();

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentStories[currentStoryIndex];
  const creatorName = currentStory?.creator_name || currentGroup?.creator_name || "Story";
  const isCreatorHandle = creatorName.trim().startsWith("@");

  // Get story ID from current group (now each group is an individual story)
  const storyId = currentGroup?.id || currentGroup?.story_id;

  // Fetch full story data when story changes
  const { data: fullStoryData, isLoading } = useQuery({
    queryKey: ["story-full", storyId],
    queryFn: async () => {
      const response = await axios.get(`/stories/${storyId}`);
      return response.data?.data || null;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!storyId && isViewerOpen,
  });

  // Update current stories when data loads
  useEffect(() => {
    if (fullStoryData?.stories) {
      setCurrentStories(fullStoryData.stories);
    }
  }, [fullStoryData, setCurrentStories]);

  // Handle progress and auto-advance
  useEffect(() => {
    if (!currentStory || isPaused || isLoading) {
      return;
    }

    const duration = (currentStory.duration || 5) * 1000; // Duration in ms
    const interval = 50; // Update every 50ms
    const increment = (interval / duration) * 100;
    let currentProgress = 0;

    setProgress(0);

    progressTimerRef.current = setInterval(() => {
      currentProgress += increment;

      if (currentProgress >= 100) {
        clearInterval(progressTimerRef.current);
        setProgress(100);
        // Defer nextStory to avoid state update during render
        setTimeout(() => nextStory(), 0);
      } else {
        setProgress(currentProgress);
      }
    }, interval);

    // Mark story as viewed
    markViewed(`story_${storyId}`);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [currentStory, currentStoryIndex, isPaused, isLoading, storyId]);

  // Handle video play/pause
  useEffect(() => {
    if (currentStory?.media_type === "video" && videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, currentStory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowRight":
          nextStory();
          break;
        case "ArrowLeft":
          prevStory();
          break;
        case "Escape":
          closeViewer();
          break;
        case " ":
          e.preventDefault();
          setIsPaused((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextStory, prevStory, closeViewer]);

  // Handle click on left/right areas
  const handleAreaClick = useCallback(
    (e, side) => {
      e.stopPropagation();
      if (side === "left") {
        prevStory();
      } else {
        nextStory();
      }
    },
    [nextStory, prevStory]
  );

  // Handle pause on hold
  const handleMouseDown = () => setIsPaused(true);
  const handleMouseUp = () => setIsPaused(false);
  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => setIsPaused(false);

  if (!isViewerOpen) return null;

  return (
    <Modal
      isOpen={isViewerOpen}
      toggle={closeViewer}
      centered
      className={styles.storyModal}
      contentClassName={styles.storyModalContent}
      backdrop={true}
    >
      <div className={styles.storyViewer}>
        {/* Close button */}
        <button className={styles.closeButton} onClick={closeViewer}>
          <RiCloseLine size={28} />
        </button>

        {/* Progress bars */}
        <div className={styles.progressContainer}>
          {currentStories.map((_, idx) => (
            <div key={idx} className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width:
                    idx < currentStoryIndex
                      ? "100%"
                      : idx === currentStoryIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header with creator info */}
        <div className={styles.header}>
          <div className={styles.creatorInfo}>
            <span
              className={`${styles.creatorName} ${isCreatorHandle ? styles.creatorHandle : ""}`}
              dir={isCreatorHandle ? "ltr" : "auto"}
            >
              {creatorName}
            </span>
            <span className={styles.timeAgo}>
              {currentStory?.time_remaining || ""}
            </span>
          </div>
        </div>

        {/* Main content */}
        <div
          className={styles.contentArea}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Navigation areas */}
          <div
            className={styles.navAreaLeft}
            onClick={(e) => handleAreaClick(e, "left")}
          >
            <RiArrowLeftSLine className={styles.navIcon} size={40} />
          </div>
          <div
            className={styles.navAreaRight}
            onClick={(e) => handleAreaClick(e, "right")}
          >
            <RiArrowRightSLine className={styles.navIcon} size={40} />
          </div>

          {/* Loading state */}
          {isLoading && !currentStory && (
            <div className={styles.loading}>
              <div className={styles.spinner} />
            </div>
          )}

          {/* Media content */}
          {currentStory && (
            <>
              {currentStory.media_type === "video" ? (
                <video
                  ref={videoRef}
                  src={currentStory.media_url}
                  className={styles.storyMedia}
                  autoPlay
                  muted
                  playsInline
                  loop={false}
                />
              ) : (
                <img
                  src={currentStory.media_url}
                  alt={currentStory.title || "Story"}
                  className={styles.storyMedia}
                />
              )}
            </>
          )}
        </div>

        {/* Bottom overlay content - positioned relative to storyViewer */}
        {currentStory && !isLoading && (
          <>
            {/* Story title */}
            {currentStory.title && (
              <div className={styles.storyTitle}>{currentStory.title}</div>
            )}

            {/* Shop Now button */}
            {currentStory.link && (
              <Link
                href={currentStory.link}
                className={styles.shopButton}
                onClick={() => closeViewer()}
              >
                {currentStory.button_text || t("ShopNow")}
              </Link>
            )}

            {/* Product info */}
            {currentStory.product && (
              <Link
                href={`/product/${currentStory.product.slug}`}
                className={styles.productCard}
                onClick={() => closeViewer()}
              >
                <div className={styles.productInfo}>
                  <span className={styles.productName}>
                    {currentStory.product.name}
                  </span>
                  <span className={styles.productPrice}>
                    {currentStory.product.price} AED
                  </span>
                </div>
              </Link>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default StoryViewer;
