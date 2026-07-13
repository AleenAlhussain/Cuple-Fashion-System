"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStoryState } from "@/states";
import useAxios from "@/utils/api/helpers/useAxios";
import { useTranslation } from "react-i18next";
import styles from "./StoryThumbnails.module.scss";
import StoryViewer from "./StoryViewer";

const StoryThumbnails = () => {
  const { t } = useTranslation("common");
  const axios = useAxios();
  const queryClient = useQueryClient();
  const { storyGroups, setStoryGroups, openViewer, isViewerOpen, loadViewedStories, viewedStories } = useStoryState();
  const [mounted, setMounted] = useState(false);

  // Mark as mounted for hydration
  useEffect(() => {
    setMounted(true);
    loadViewedStories();
  }, []);

  // Fetch story thumbnails with aggressive caching
  const { data, isLoading } = useQuery({
    queryKey: ["story-thumbnails"],
    queryFn: async () => {
      const response = await axios.get("/stories");
      return response.data?.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,    // 15 minutes cache retention
    refetchOnWindowFocus: false,
    enabled: mounted,
  });

  // Update state when data changes
  useEffect(() => {
    if (data && data.length > 0) {
      setStoryGroups(data);
    }
  }, [data, setStoryGroups]);

  const prefetchStory = (storyId) => {
    if (!storyId) return;

    queryClient.prefetchQuery({
      queryKey: ["story-full", storyId],
      queryFn: async () => {
        const response = await axios.get(`/stories/${storyId}`);
        return response.data?.data || null;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Handle click to open viewer
  const handleClick = (index) => {
    const story = storyGroups[index];
    prefetchStory(story?.id || story?.story_id);
    openViewer(index);
  };

  // Check if a story has been viewed
  const isStoryViewed = (story) => {
    return viewedStories.includes(`story_${story.id || story.story_id}`);
  };

  // Don't render anything if no stories or not mounted
  if (!mounted || isLoading || !storyGroups || storyGroups.length === 0) {
    return null;
  }

  return (
    <>
      <div className={styles.storiesSection}>
        <h3 className={styles.sectionTitle}>{t("CupleStories")}</h3>
        <div className={styles.storiesContainer}>
          <div className={styles.storiesWrapper}>
            {storyGroups.map((story, index) => (
              <div
                key={story.id || story.story_id}
                className={`${styles.storyCard} ${isStoryViewed(story) ? styles.viewed : ""}`}
                onClick={() => handleClick(index)}
                onMouseEnter={() => prefetchStory(story.id || story.story_id)}
                onTouchStart={() => prefetchStory(story.id || story.story_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleClick(index)}
              >
                {story.thumbnail ? (
                  <Image
                    src={story.thumbnail}
                    alt={story.title || "Story"}
                    fill
                    className={styles.cardImage}
                    unoptimized
                  />
                ) : (
                  <div className={styles.cardPlaceholder}>
                    <span>{story.creator_name?.charAt(0) || "S"}</span>
                  </div>
                )}
                {/* Gradient overlay */}
                <div className={styles.cardOverlay} />
                {/* Title overlay */}
                {story.title && (
                  <span className={styles.storyTitle}>{story.title}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lazy loaded viewer - only rendered when needed */}
      {isViewerOpen && <StoryViewer />}
    </>
  );
};

export default StoryThumbnails;
