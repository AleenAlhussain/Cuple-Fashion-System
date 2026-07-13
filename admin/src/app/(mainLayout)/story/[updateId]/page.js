'use client';

import StoryForm from "@/components/story/StoryForm";
import { useParams } from "next/navigation";

const UpdateStory = () => {
  const params = useParams();

  return (
    params?.updateId && (
      <StoryForm
        updateId={params.updateId}
        title="Edit Story"
        buttonName="Update Story"
      />
    )
  );
};

export default UpdateStory;
