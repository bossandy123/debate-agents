/**
 * Home Page
 * 首页 - 重定向到创建辩论页面
 */

import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/create-debate");
}
