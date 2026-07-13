"use client"
import dynamic from "next/dynamic";
const MainDashboard = dynamic(() => import("@/components/dashboard"), { ssr: false })

const Dashboard = () => {
  return (
    <MainDashboard />
  )
};

export default Dashboard;