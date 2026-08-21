# Loading 动画组件

## 1. 背景与目标

此前项目缺少统一的「炫酷级」加载动画组件：
- `Spinner` 是一个简单的 CSS 旋转圆点，适合按钮内嵌但不够大气。
- `antd Spin` 样式比较朴素，和当前的深色/浅色+主题色渐变设计风格不够契合。
- 「全局页面级 Loading 遮罩」（见 [全局通知与加载遮罩](../layout/全局通知与加载遮罩.md)）需要一个**视觉足够出彩、可缩放、与主题色自动联动**的 Loading 组件做底座。

本篇新增 `framer-motion` 依赖 + `apps/frontend/src/components/ui/loading.tsx`，提供以下能力：

- 三层 SVG 圆环嵌套，正反向不同速度旋转（外圈 2.5s 正向 / 中圈 3s 反向 / 内圈 1.5s 正向），形成视觉差。
- 圆环使用 SVG linearGradient（`grad1` 主色→透明 + `grad2` 透明→主色 反方向）配合 `strokeDasharray` 做非闭环弧，叠加 `feGaussianBlur` 光晕。
- 中心双层呼吸光点：外层大点慢速缩放+透明度呼吸，内层小点节奏反相。
- 文字「加载中...」拆分为单个字符，波浪式上下跳动（delay 按 index × 0.08s），伴随缩放和透明度变化。
- 组件尺寸通过 `size` 属性控制（默认 75px），所有几何参数按 `scale = size / 80` 自动等比换算，保证不同尺寸保持一致比例。
- 颜色完全通过 `color: var(--color-primary)` 继承，深浅色切换、主题色切换自动适配，无需改组件代码。

延伸阅读：[全局通知与加载遮罩](../layout/全局通知与加载遮罩.md)（Loading 组件的上层使用场景）。

## 2. 改动范围

- `apps/frontend/package.json`（新增 `framer-motion` 依赖）
- `pnpm-lock.yaml`（自动更新）
- `apps/frontend/src/components/ui/loading.tsx`（新增）
- `apps/frontend/src/components/ui/index.ts`（重导出）

## 3. 实现思路

- **动画库选型**：用 `framer-motion` 而非纯 CSS keyframes。原因：
  1. Framer Motion 直接支持 `custom` 向 variants 传参，每个 circle 的时长和方向可以复用同一 variants 对象；纯 CSS 需要写 3 套 class。
  2. 文字波浪用 stagger-like 的 `delay: index * 0.08` 在 JS 里按字符循环生成，比 CSS `calc(var(--i) * 0.08s)` 写法更直观。
  3. 中心光点「缩放 + 透明度」双属性过渡一行 `animate` 即可搞定。
- **颜色主题联动**：所有 stroke 均用 `url(#grad1) / url(#grad2)`，渐变 `stopColor` 设为 `currentColor`；外层容器用 `style={{ color: 'var(--color-primary)' }}` 把 currentColor 指向主题变量。切换主题色、深浅色均自动联动。
- **尺寸缩放**：以 80px 为基准尺寸，`scale = size / 80`；所有半径、strokeWidth、dashArray 数值都乘以 scale，保证任意尺寸比例一致。
- **小尺寸兜底**：中心光点在尺寸很小时不能为 0，因此用 `Math.max(minOuterSize, 20 * scale)` 设置最小外光点 8px、内光点 4px。
- **性能**：SVG viewBox 固定 `0 0 100 100`，不随容器 size 重新计算坐标，所有动画都是 transform（GPU 合成），渲染开销极低。

## 4. 关键实现（改动前 / 改动后对比 + 注释）

### 4.1 `package.json` 新增 `framer-motion` 依赖

**改动前** · `apps/frontend/package.json`（基线，摘录 dependencies 段）

```json
{
  "dependencies": {
    "antd": "^5.22.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "dayjs": "^1.11.21",
    "lucide-react": "^1.28.0",
    "mobx": "^6.15.0",
    "mobx-react": "^9.2.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router": "^7.1.1",
    "tailwindcss": "^4.0.0",
    "tw-animate-css": "^1.0.0",
    "zod": "^3.24.1"
  }
}
```

**改动后** · `apps/frontend/package.json`（当前，摘录 dependencies 段）

```json
{
  "dependencies": {
    "antd": "^5.22.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "dayjs": "^1.11.21",
    // 新增：framer-motion 动画库，驱动 Loading 组件的三层圆环、光点呼吸、文字波浪
    "framer-motion": "^13.1.0",
    "lucide-react": "^1.28.0",
    "mobx": "^6.15.0",
    "mobx-react": "^9.2.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router": "^7.1.1",
    "tailwindcss": "^4.0.0",
    "tw-animate-css": "^1.0.0",
    "zod": "^3.24.1"
  }
}
```

### 4.2 `Loading` 组件（`apps/frontend/src/components/ui/loading.tsx`）

**对比范围**：纯新增文件，无改动前版本。

**改动后 · 新增文件** · `apps/frontend/src/components/ui/loading.tsx`（约 L1–L200，完整内容）

```typescript
// 引入 framer-motion 动画库：motion 组件 + Variants 类型
import { motion, Variants } from 'framer-motion';
// React 基本类型 + useMemo
import { FC, useMemo } from 'react';

// Loading 组件的 props 接口
interface LoadingProps {
        // 可选：加载提示文字（默认"加载中..."）
        text?: string;
        // 可选：附加到根容器的 className（Tailwind）
        className?: string;
        /**
         * 控制加载图标整体大小 (像素)
         * 默认 75px
         */
        // size：SVG 容器 + 中心光点几何均按此值等比缩放
        size?: number;
        // animate：是否启用文字波浪动画（默认 true；关闭时文字静止）
        animate?: boolean;
        // children：可选的底部附加内容，例如"预计还需 3 秒"
        children?: React.ReactNode;
}

// 定义圆环动画的 framer-motion Variants 模板（通过 custom 传 duration / direction）
const circleVariants: Variants = {
        // spin：旋转一整圈（360° * direction）
        spin: (custom: { duration: number; direction: number }) => ({
                // rotate 属性：角度 360 * 方向（正/反）
                rotate: 360 * custom.direction,
                // transition 配置
                transition: {
                        // 单圈时长
                        duration: custom.duration,
                        // 线性（匀速旋转，避免忽快忽慢）
                        ease: 'linear',
                        // 无限循环
                        repeat: Infinity,
                },
        }),
};

// Loading 组件（默认导出，ui/index.ts 再重导出为具名）
const Loading: FC<LoadingProps> = ({
        // 默认加载文案
        text = '加载中...',
        // 默认 className 空串
        className = '',
        // 默认尺寸 75px
        size = 75,
        // 默认开启动画
        animate = true,
        // 底部附加内容
        children,
}) => {
        // 用局部变量 label 备用
        const label = text;
        // 把文案拆成字符数组，文字波浪动画按字符循环
        const textArray = label.split('');

        // 核心逻辑：尺寸计算（useMemo 缓存避免每次 render 重算）
        const config = useMemo(() => {
                // 以 80px 为基准尺寸，得到缩放系数
                const scale = size / 80;

                // 三层圆环的几何/动画配置
                const circles = [
                        {
                                // 外圈半径
                                r: 36 * scale,
                                // 圆环线条粗细
                                strokeWidth: 5 * scale,
                                // 虚线段 + 空白段 长度（制造不闭合弧效果）
                                dashArray: `${120 * scale} ${180 * scale}`,
                                // 单圈时长 2.5s
                                duration: 2.5,
                                // 正向旋转
                                direction: 1,
                                // 选用正向渐变（主色→透明）
                                gradient: 'grad1',
                        },
                        {
                                // 中圈半径
                                r: 26 * scale,
                                strokeWidth: 4 * scale,
                                dashArray: `${90 * scale} ${140 * scale}`,
                                // 单圈时长 3s，比外圈稍慢
                                duration: 3,
                                // 反向旋转——与外圈形成视觉差
                                direction: -1,
                                // 选用反向渐变（透明→主色）
                                gradient: 'grad2',
                        },
                        {
                                // 内圈半径
                                r: 18 * scale,
                                strokeWidth: 3 * scale,
                                dashArray: `${60 * scale} ${110 * scale}`,
                                // 单圈时长 1.5s，最快
                                duration: 1.5,
                                // 正向
                                direction: 1,
                                // 仍用 grad1，但降低 opacity，制造层次
                                gradient: 'grad1',
                                opacity: 0.6,
                        },
                ];

                // 中心光点最小尺寸兜底，避免极端 size=10 时光点消失
                const minOuterSize = 8;
                const minInnerSize = 4;

                // 外层光点的最终尺寸：至少 minOuterSize
                const outerSize = Math.max(minOuterSize, 20 * scale);
                // 内层光点的最终尺寸：至少 minInnerSize
                const innerSize = Math.max(minInnerSize, 10 * scale);

                // 返回配置对象
                return {
                        // SVG 容器尺寸（正方形，width = height = size）
                        containerSize: size,
                        // 三层圆环配置数组
                        circles,
                        // 中心光点尺寸
                        centerGlow: {
                                outer: outerSize,
                                inner: innerSize,
                        },
                };
        }, [size]); // size 变化时重新计算几何

        // JSX 根容器
        return (
                // 纵向居中：flex 垂直布局，图标在上、文字在下、附加 children 最底
                <div
                        // className 合并默认 + 用户传入
                        className={`flex w-full flex-col items-center justify-center gap-4 ${className}`}
                        // 颜色使用主题变量 --color-primary；SVG currentColor 会继承此色
                        style={{ color: 'var(--color-primary)' }}
                >
                        {/* 动态容器：容纳 SVG + 中心光点（绝对定位） */}
                        <div
                                // relative 以便内部绝对定位的中心光点居中
                                className="relative"
                                // 宽高等于配置好的 containerSize
                                style={{ width: config.containerSize, height: config.containerSize }}
                        >
                                {/* motion.svg：外层动画驱动容器 */}
                                <motion.svg
                                        // 占满父容器
                                        className="h-full w-full"
                                        // viewBox 固定 0 0 100 100，所有坐标用百分比语义缩放
                                        viewBox="0 0 100 100"
                                        // 无障碍 role
                                        role="img"
                                        // 无障碍标签
                                        aria-label={label}
                                        // 保持比例，居中裁剪
                                        preserveAspectRatio="xMidYMid meet"
                                >
                                        {/* defs 定义 filter / gradient 引用 */}
                                        <defs>
                                                {/* 高斯模糊 filter：圆环发光效果 */}
                                                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                                        {/* 先做 2.5 标准差的高斯模糊，输出 coloredBlur */}
                                                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                                        {/* feMerge 合成：先画模糊层，再画原始清晰图形 */}
                                                        <feMerge>
                                                                <feMergeNode in="coloredBlur" />
                                                                <feMergeNode in="SourceGraphic" />
                                                        </feMerge>
                                                </filter>
                                                {/* grad1：线性渐变 0%→100%（主色→透明） */}
                                                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        {/* 起点：当前 currentColor 不透明 */}
                                                        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                                                        {/* 终点：当前 currentColor 完全透明 */}
                                                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                                                </linearGradient>
                                                {/* grad2：线性渐变 透明→主色（与 grad1 反方向） */}
                                                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        {/* 起点：透明 */}
                                                        <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                                                        {/* 终点：不透明 */}
                                                        <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
                                                </linearGradient>
                                        </defs>

                                        {/* 渲染三层圆环 */}
                                        {config.circles.map((circle, index) => (
                                                // motion.circle：带动画的 SVG circle
                                                <motion.circle
                                                        // React key
                                                        key={index}
                                                        // 圆心 x：居中 50
                                                        cx="50"
                                                        // 圆心 y：居中 50
                                                        cy="50"
                                                        // 半径：配置中算出
                                                        r={circle.r}
                                                        // 不填充，仅描边
                                                        fill="none"
                                                        // 描边使用指定的渐变
                                                        stroke={`url(#${circle.gradient})`}
                                                        // 描边宽度
                                                        strokeWidth={circle.strokeWidth}
                                                        // 线段两端用圆形（更柔和）
                                                        strokeLinecap="round"
                                                        // 虚线段制造开环弧
                                                        strokeDasharray={circle.dashArray}
                                                        // 单层 opacity（第三层半透明）
                                                        strokeOpacity={circle.opacity || 1}
                                                        // 应用 glow 发光 filter
                                                        filter="url(#glow)"
                                                        // 旋转中心 = 圆心
                                                        style={{ transformOrigin: 'center' }}
                                                        // 复用 circleVariants 模板
                                                        variants={circleVariants}
                                                        // 动画状态：spin
                                                        animate="spin"
                                                        // custom 把 duration 和 direction 传给 variants
                                                        custom={{
                                                                duration: circle.duration,
                                                                direction: circle.direction,
                                                        }}
                                                />
                                        ))}
                                </motion.svg>

                                {/* 中心光点：绝对定位覆盖在 SVG 中心区域 */}
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                        {/* 外层大点：模糊 + 呼吸 */}
                                        <motion.div
                                                // 圆形、用当前色填充、加一点 blur 形成晕光
                                                className="rounded-full bg-current opacity-20 blur-sm"
                                                // 宽高来自 config.centerGlow.outer
                                                style={{
                                                        width: config.centerGlow.outer,
                                                        height: config.centerGlow.outer,
                                                }}
                                                // animate：在 [1, 0.9, 1] 间缩放；透明度在 [0.2, 0.4, 0.2] 间呼吸
                                                animate={{
                                                        scale: [1, 0.9, 1],
                                                        opacity: [0.2, 0.4, 0.2],
                                                }}
                                                // transition：1.5 秒一轮，无限循环，缓入缓出
                                                transition={{
                                                        duration: 1.5,
                                                        repeat: Infinity,
                                                        ease: 'easeInOut',
                                                }}
                                        />
                                        {/* 内层小点：更实更亮 */}
                                        <motion.div
                                                // 绝对叠在中心点
                                                className="absolute rounded-full bg-current opacity-80"
                                                style={{
                                                        width: config.centerGlow.inner,
                                                        height: config.centerGlow.inner,
                                                }}
                                                // animate：节奏与外层相反，避免整体呼吸节奏单调
                                                animate={{
                                                        scale: [1, 1.2, 1],
                                                        opacity: [0.8, 0.4, 0.8],
                                                }}
                                                // 相同时长，但 animate 数值相反，视觉上是「内缩」和「外胀」交替
                                                transition={{
                                                        duration: 1.5,
                                                        repeat: Infinity,
                                                        ease: 'easeInOut',
                                                }}
                                        />
                                </div>
                        </div>

                        {/* 文字波浪动画：flex 居中 + 字符间距 gap 0.5 + tracking-wider */}
                        <div
                                className="flex justify-center gap-0.5 text-sm font-medium tracking-wider"
                                // 文字颜色同样使用主题色变量
                                style={{ color: 'var(--color-primary)' }}
                        >
                                {animate ? (
                                        // 开启动画：每个字符独立 motion.span
                                        textArray.map((char, index) => (
                                                <motion.span
                                                        key={index}
                                                        // inline-block 才能产生 Y 轴位移
                                                        className="inline-block"
                                                        // 加一点 drop-shadow，让字符带轻微光晕
                                                        style={{ filter: 'drop-shadow(0 0 1px currentColor)' }}
                                                        // animate：上下跳 + 放大缩小 + 透明度呼吸
                                                        animate={{
                                                                y: [0, -8, 0],
                                                                scale: [1, 1.1, 1],
                                                                opacity: [0.6, 1, 0.6],
                                                        }}
                                                        // transition：1.5s 一轮；每字符 delay = index * 0.08s 形成波浪
                                                        transition={{
                                                                duration: 1.5,
                                                                ease: 'easeInOut',
                                                                repeat: Infinity,
                                                                delay: index * 0.08,
                                                        }}
                                                >
                                                        {/* 空格替换为不间断空格（否则 inline-block 宽度为 0） */}
                                                        {char === ' ' ? '\u00A0' : char}
                                                </motion.span>
                                        ))
                                ) : (
                                        // 关闭动画：仅渲染纯文本（避免不必要的 DOM 复杂度）
                                        <span>{label}</span>
                                )}
                        </div>

                        {/* 附加 children：如"预计还需 3 秒"的提示 */}
                        {children && <div className="mt-4">{children}</div>}
                </div>
        );
};

// 默认导出；通过 ui/index.ts 再 `export { default as Loading } from './loading'` 暴露
export default Loading;
```

## 5. 行为变化与兼容性

| 维度 | 行为 |
|------|------|
| 尺寸调整 | `size` 默认 75px；遮罩场景 `size={75}`；未来弹层/卡片内嵌可设 `size={40}`。 |
| 主题联动 | 完全靠 CSS var `--color-primary`；深浅色、主题预设切换时颜色自动同步。 |
| 可访问性 | SVG 提供 `role="img"` 与 `aria-label={text}`；屏幕阅读器读出提示文字。 |
| 关闭动画 | `animate={false}` 时文字不做波浪动效，直接显示静态文字，适合低端设备场景。 |
| 依赖新增 | 增加 `framer-motion@^13.1.0`（约 70KB gzip），构建体积略有增加但功能匹配。 |

## 6. 测试与回归建议

1. 默认 `size={75}`：三层圆环旋转方向应为「顺时针/逆时针/顺时针」，中心光点应呈现呼吸节奏。
2. 切主题色：在 AdminLayout 顶部主题色下拉切换靛青/紫色/琥珀等配色 → Loading 圆环与文字颜色应同步变化。
3. 切深浅色模式：浅色背景 `bg-background/80` 半透遮罩应可读；深色下文字发光对比度仍足够。
4. `size={40}`：几何与文字应按比例缩小，不出现裁切或溢出。
5. `text="Fetching..."`：英文时波浪节奏与中文相同（字符波浪 delay 仍 index*0.08s）；空格位置不应出现「塌陷」（已用 `\u00A0` 替换）。
6. 全局遮罩场景（见全局通知与加载遮罩专题）：点击菜单或切换列表 → 遮罩应居中覆盖 `<Outlet>` 区域，不遮住侧栏/顶栏/顶部 Alert。

## 7. 相关文档与代码索引

| 说明 | 路径 |
|------|------|
| 全局通知与加载遮罩（延伸阅读） | `docs/layout/全局通知与加载遮罩.md` |
| 组件源码 | `apps/frontend/src/components/ui/loading.tsx` |
| UI 统一重导出 | `apps/frontend/src/components/ui/index.ts` |
| 依赖声明 | `apps/frontend/package.json` |
| CSS 主题变量（--color-primary 来源） | `apps/frontend/src/index.css` |

---

（若与仓库最新源码不一致，以源码为准）
