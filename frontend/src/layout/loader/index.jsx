import React from "react";

const Loader = ({ classes }) => {
  const wrapperClass = ["loader-wrapper", classes].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass} suppressHydrationWarning>
      <div>
        <div className="loader" />
        <h3>Loading</h3>
      </div>
    </div>
  );
};

export default Loader;
