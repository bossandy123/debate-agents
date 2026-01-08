/**
 * Glass Effect Demo Page
 * 玻璃模糊效果演示页面
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";

export default function GlassDemoPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              玻璃模糊效果演示
            </h1>
            <p className="text-lg text-muted-foreground">
              Glassmorphism Effects - 按钮和卡片组件
            </p>
          </div>

          {/* Glass Buttons */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">玻璃按钮 (Glass Buttons)</h2>
            <div className="flex flex-wrap gap-4 p-8 glass-card rounded-3xl">
              <Button variant="glass" size="sm">
                小号玻璃按钮
              </Button>
              <Button variant="glass" size="md">
                中号玻璃按钮
              </Button>
              <Button variant="glass" size="lg">
                大号玻璃按钮
              </Button>
              <Button variant="glass" size="lg" isLoading>
                加载中...
              </Button>
            </div>
          </div>

          {/* Glass Cards */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">玻璃卡片 (Glass Cards)</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Default Card */}
              <Card>
                <CardHeader>
                  <CardTitle>默认卡片</CardTitle>
                  <CardDescription>标准卡片样式</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    这是默认的卡片样式，使用常规的背景和边框。
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="secondary" size="sm">了解更多</Button>
                </CardFooter>
              </Card>

              {/* Glass Card */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>玻璃卡片</CardTitle>
                  <CardDescription>半透明玻璃效果</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    这是玻璃效果的卡片，具有半透明背景和模糊效果，类似磨砂玻璃。
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="glass" size="sm">了解更多</Button>
                </CardFooter>
              </Card>

              {/* Glass Elevated Card */}
              <Card variant="glass-elevated">
                <CardHeader>
                  <CardTitle>高级玻璃卡片</CardTitle>
                  <CardDescription>增强玻璃效果</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    这是高级玻璃效果的卡片，具有更强的模糊和阴影效果，视觉层次更明显。
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="glass" size="sm">了解更多</Button>
                </CardFooter>
              </Card>
            </div>
          </div>

          {/* Mixed Examples */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">混合使用示例</h2>
            <Card variant="glass-elevated">
              <CardHeader>
                <CardTitle>全玻璃效果组件</CardTitle>
                <CardDescription>玻璃卡片 + 玻璃按钮</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  这个例子展示了如何在一个玻璃卡片中使用玻璃按钮，创造出统一的视觉风格。
                  玻璃模糊效果（Glassmorphism）特别适合用于：
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>悬浮面板和弹出层</li>
                  <li>模态对话框</li>
                  <li>导航栏和工具栏</li>
                  <li>数据可视化卡片</li>
                </ul>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button variant="glass">取消</Button>
                <Button variant="glass">确认</Button>
                <Button variant="primary" size="sm">主要操作</Button>
              </CardFooter>
            </Card>
          </div>

          {/* Comparison Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">效果对比</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-primary/20 to-pro/20 rounded-3xl">
                <h3 className="font-semibold mb-4">传统样式</h3>
                <div className="space-y-3">
                  <Button variant="primary">主要按钮</Button>
                  <Button variant="secondary">次要按钮</Button>
                  <Button variant="ghost">幽灵按钮</Button>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-br from-primary/20 to-audience/20 rounded-3xl">
                <h3 className="font-semibold mb-4">玻璃样式</h3>
                <div className="space-y-3">
                  <Button variant="glass">玻璃按钮</Button>
                  <Card variant="glass" className="p-4">
                    <p className="text-sm font-medium">玻璃卡片</p>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
