"use client";
import { Component } from "react";
import { unstable_batchedUpdates } from "react-dom";

unstable_batchedUpdates(() => {
  console.error = () => {};
});

class ErrorBoundary extends Component {
  componentDidCatch(error) {
    if (error.message.includes("ToastContainer")) {
      return;
    }
  }

  render() {
    return this.props.children;
  }
}

export default ErrorBoundary;
