# UI 组件库实现

## 1. 背景与目标

前端项目需要一套一致、可访问的 UI 组件库，以提升开发效率并保证视觉与交互的统一性。解决方案：基于 Radix UI 无障碍原语 + Tailwind CSS + class-variance-authority (CVA) 构建轻量级组件库，通过 CVA 管理组件变体（尺寸、样式类型），确保类型安全与可维护性。

## 2. 改动范围

| 文件路径 | 说明 |
|---------|------|
| `apps/frontend/src/components/ui/button.tsx` | 按钮组件，支持多种变体与尺寸 |
| `apps/frontend/src/components/ui/card.tsx` | 卡片组件族（Card、CardHeader、CardTitle 等） |
| `apps/frontend/src/components/ui/dropdown-menu.tsx` | 下拉菜单组件，基于 Radix UI DropdownMenu |
| `apps/frontend/src/components/ui/scroll-area.tsx` | 滚动区域组件，基于 Radix UI ScrollArea |
| `apps/frontend/src/components/ui/spinner.tsx` | 加载指示器组件 |
| `apps/frontend/src/components/ui/index.ts` | 桶出口（Barrel Export），统一导出所有 UI 组件 |
| `apps/frontend/src/lib/table-pagination.ts` | Ant Design Table 分页器配置工具函数 |
| `apps/frontend/src/lib/utils.ts` | 通用工具函数（cn、formatDate 等） |

## 3. 核心思路

- **Radix UI**：使用 Radix UI 提供的无障碍原语（Primitives）作为底层，确保组件的可访问性（Accessibility）和跨浏览器一致性。
- **CVA (class-variance-authority)**：使用 CVA 为组件提供类型安全的变体管理（variant），统一处理 `size`、`variant` 等 props。
- **clsx + tailwind-merge**：使用 `clsx` 灵活组合 className，再通过 `tailwind-merge` 解决 Tailwind CSS 类名冲突问题。
- **forwardRef**：所有组件使用 `React.forwardRef` 转发 ref，保证组件可被外部 ref 引用。
- **桶导出（Barrel Export）**：通过 `index.ts` 统一导出所有组件，简化导入路径。

## 4. 关键代码

### 4.1 Button 组件（CVA 变体实现）

> 来源：`apps/frontend/src/components/ui/button.tsx`

```tsx
// 从 Radix UI 引入 Slot 组件，用于 asChild 模式（将样式合并到子元素而非渲染 button 标签）
import { Slot } from '@radix-ui/react-slot';
// 引入 CVA 核心函数和 VariantProps 类型，用于定义组件变体
import { cva, type VariantProps } from 'class-variance-authority';
// 引入 React 核心库
import * as React from 'react';
// 引入 cn 工具函数，用于类名合并
import { cn } from '@/lib/utils';
// 引入 Spinner 加载指示器组件
import { Spinner } from './spinner';

// 使用 CVA 定义按钮的基础样式和变体
const buttonVariants = cva(
  // 基础样式：弹性布局、间距、圆角、字体、过渡效果、聚焦/禁用状态
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    // 定义变体分类
    variants: {
      // variant 变体：控制按钮的视觉风格
      variant: {
        // 默认按钮：主色调背景
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        // 破坏性按钮：红色/警示色背景
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        // 轮廓按钮：边框样式
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        // 次要按钮：次级背景
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        // 幽灵按钮：无边框无背景，悬停显示背景
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        // 链接按钮：文字下划线样式
        link: 'text-primary underline-offset-4 hover:underline',
        // 加载中按钮：半透明主色调
        loading: 'bg-primary/50 text-primary-foreground',
      },
      // size 变体：控制按钮的尺寸
      size: {
        // 默认尺寸：高度 36px，内边距 16px/8px
        default: 'h-9 px-4 py-2',
        // 小尺寸：高度 32px，圆角，小内边距，小字体
        sm: 'h-8 rounded-md px-3 text-xs',
        // 大尺寸：高度 40px，大圆角，大内边距
        lg: 'h-10 rounded-md px-8',
        // 图标按钮尺寸：正方形 36px
        icon: 'h-9 w-9',
        // 小图标按钮：正方形 32px
        'icon-sm': 'h-8 w-8',
        // 大图标按钮：正方形 40px
        'icon-lg': 'h-10 w-10',
      },
    },
    // 默认变体：未指定时使用 default 样式和尺寸
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// 定义 Button 组件的 Props 接口
export interface ButtonProps
  // 继承原生 button 元素的所有属性
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    // 继承 CVA 推导的变体属性（variant、size）
    VariantProps<typeof buttonVariants> {
  // asChild 选项：为 true 时不渲染 button 标签，而是将样式合并到子元素
  asChild?: boolean;
}

// 使用 forwardRef 包装 Button 组件，支持外部 ref 转发
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  // 解构 props：className（用户自定义类名）、variant（样式变体）、size（尺寸变体）、asChild（子元素模式，默认 false）、children（子内容）、其余 props
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    // 根据 asChild 决定渲染的组件类型：Slot（子元素模式）或 'button'（原生按钮）
    const Comp = asChild ? Slot : 'button';
    // 根据 variant 决定按钮内容：loading 变体显示 Spinner + 子内容，其他变体直接显示子内容
    const content =
      variant === 'loading' ? (
        // loading 状态：包裹 Spinner 和 children
        <>
          {/* Spinner 组件：尺寸 16px，旋转动画 */}
          <Spinner className="size-4" />
          {/* 显示按钮文字内容 */}
          {children}
        </>
      ) : (
        // 非 loading 状态：直接显示子内容
        children
      );
    // 返回渲染的组件
    return (
      // 使用 Comp 组件（Slot 或 button），合并 CVA 生成的类名和用户自定义类名
      <Comp
        // cn 函数合并基础样式、变体样式和用户传入的 className
        className={cn(buttonVariants({ variant, size, className }))}
        // 转发 ref 到内部元素
        ref={ref}
        // 展开其余原生属性
        {...props}
      >
        {/* 渲染按钮内容（Spinner + children 或纯 children） */}
        {content}
      </Comp>
    );
  },
);
// 设置组件的 displayName，便于 React DevTools 调试
Button.displayName = 'Button';

// 导出 Button 组件和 buttonVariants（供其他组件复用变体定义）
export { Button, buttonVariants };
```

### 4.2 Card 组件族

> 来源：`apps/frontend/src/components/ui/card.tsx`

```tsx
// 引入 React 核心库
import * as React from 'react';
// 引入 cn 工具函数
import { cn } from '@/lib/utils';

// Card 容器组件：使用 forwardRef 转发 ref，渲染为 div
const Card = React.forwardRef<
  // 泛型参数：HTMLDivElement 表示 ref 类型
  HTMLDivElement,
  // 泛型参数：HTMLAttributes<HTMLDivElement> 表示 props 类型
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  // 渲染 div 元素，转发 ref，合并类名
  <div
    // 设置 ref 到 div 元素
    ref={ref}
    // 合并基础卡片样式（圆角、边框、背景、阴影）和用户自定义 className
    className={cn(
      'rounded-xl border bg-card text-card-foreground shadow',
      className,
    )}
    // 展开其余属性
    {...props}
  />
));
// 设置 displayName 便于调试
Card.displayName = 'Card';

// CardHeader 组件：卡片头部区域
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // 头部样式：垂直弹性布局，子元素间距 6px，内边距 24px
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// CardTitle 组件：卡片标题
const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // 标题样式：粗体、行高紧凑、字间距紧凑
    className={cn('font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// CardDescription 组件：卡片描述文本
const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // 描述样式：小字号，次要前景色
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// CardContent 组件：卡片内容区域
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  // 内容样式：内边距 24px，顶部无额外内边距（与 CardHeader 共享边界）
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// CardFooter 组件：卡片底部区域
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // 底部样式：水平弹性布局，垂直居中，内边距 24px，顶部无额外内边距
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// 统一导出所有 Card 组件
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
```

### 4.3 DropdownMenu 组件

> 来源：`apps/frontend/src/components/ui/dropdown-menu.tsx`

```tsx
// 引入 Radix UI DropdownMenu 全部原语
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
// 引入 lucide-react 图标库
import { Check, ChevronRight, Dot } from 'lucide-react';
// 引入 React 核心库
import * as React from 'react';
// 引入 cn 工具函数
import { cn } from '@/lib/utils';

// 别名导出 Radix 原语作为组件基础
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

// DropdownMenuSubTrigger 组件：子菜单触发器
const DropdownMenuSubTrigger = React.forwardRef<
  // ref 类型：Radix SubTrigger 组件的实例引用
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  // props 类型：Radix SubTrigger 的全部 Props + 自定义 inset 属性
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    // inset 选项：是否缩进对齐
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  // 渲染 Radix SubTrigger 原语
  <DropdownMenuPrimitive.SubTrigger
    // 转发 ref
    ref={ref}
    // 合并基础样式、inset 缩进样式和用户 className
    className={cn(
      // 基础样式：弹性布局、光标默认、间距、对齐、圆角、内边距、字号、聚焦状态、SVG 样式
      'flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      // inset 为 true 时添加左侧内边距（缩进效果）
      inset && 'pl-8',
      // 用户自定义类名
      className,
    )}
    // 展开其余属性
    {...props}
  >
    {/* 渲染子内容 */}
    {children}
    {/* 右侧箭头图标，指示可展开子菜单 */}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
));
// 继承 Radix 原语的 displayName
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

// DropdownMenuSubContent 组件：子菜单内容面板
const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    // 样式：层级 50，最小宽度，溢出隐藏，圆角，边框，背景，内边距，阴影
    // 入场/出场动画：淡入淡出、缩放、滑动
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName;

// DropdownMenuContent 组件：主菜单内容面板（通过 Portal 渲染到 body）
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  // 使用 Portal 将内容渲染到文档根节点，避免父元素样式影响
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      // 侧边偏移量，默认 4px
      sideOffset={sideOffset}
      // 样式与 SubContent 类似，但阴影层级稍低
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        // 入场/出场动画
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

// DropdownMenuItem 组件：下拉菜单项
const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    // 菜单项样式：相对定位、弹性布局、光标默认、选中对齐、圆角、内边距、字号、聚焦/禁用状态
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

// DropdownMenuCheckboxItem 组件：可勾选菜单项
const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    // 样式：与普通项类似，但左侧留出勾选指示器空间
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    // 绑定选中状态
    checked={checked}
    {...props}
  >
    {/* 勾选指示器容器：绝对定位在左侧 */}
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {/* Radix 原语的选中指示器 */}
      <DropdownMenuPrimitive.ItemIndicator>
        {/* 勾选图标 */}
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {/* 菜单项文字内容 */}
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

// DropdownMenuRadioItem 组件：单选菜单项
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      // 样式与 checkbox 项类似
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    {/* 单选指示器容器 */}
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        {/* 圆点图标表示选中状态 */}
        <Dot className="h-4 w-4 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

// DropdownMenuLabel 组件：下拉菜单标签（分组标题）
const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    // 标签样式：粗体、内边距
    className={cn(
      'px-2 py-1.5 text-sm font-semibold',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

// DropdownMenuSeparator 组件：下拉菜单分割线
const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    // 分割线样式：水平细线，使用 muted 背景色
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

// DropdownMenuShortcut 组件：快捷键提示（非 forwardRef，纯展示组件）
const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      // 快捷键样式：右对齐、小字号、字间距宽、半透明
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

// 统一导出所有 DropdownMenu 相关组件
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
```

### 4.4 tablePagination 工具函数

> 来源：`apps/frontend/src/lib/table-pagination.ts`

```ts
// 引入 Ant Design Table 分页配置类型
import type { TablePaginationConfig } from 'antd';

// 默认每页显示条数常量
export const DEFAULT_PAGE_SIZE = 20;

/**
 * antd Table 全功能分页器工具函数
 * @param total 数据总条数
 * @param pageNo 当前页码
 * @param pageSize 每页显示条数
 * @param onChange 页码或每页条数变化的回调函数
 * @returns TablePaginationConfig 完整分页配置对象
 */
export function tablePagination(
  // 数据总条数
  total: number,
  // 当前页码
  pageNo: number,
  // 每页条数
  pageSize: number,
  // 变化回调：接收新的页码和每页条数
  onChange: (page: number, size: number) => void,
): TablePaginationConfig {
  // 返回完整的分页配置对象
  return {
    // 当前页码
    current: pageNo,
    // 每页条数
    pageSize,
    // 数据总条数
    total,
    // 显示每页条数切换器
    showSizeChanger: true,
    // 显示快速跳转到指定页
    showQuickJumper: true,
    // 不显示省略项（始终显示完整页码）
    showLessItems: false,
    // 每页条数可选项
    pageSizeOptions: ['10', '20', '50', '100'],
    // 显示总数信息的自定义函数
    showTotal: (t, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${t} 条`,
    // 页码/条数变化回调
    onChange,
    // 条数变化时复用同一回调
    onShowSizeChange: onChange,
  };
}
```

### 4.5 cn() 工具函数

> 来源：`apps/frontend/src/lib/utils.ts`

```ts
// 引入 clsx 的 ClassValue 类型和 clsx 函数
import { type ClassValue, clsx } from 'clsx';
// 引入 tailwind-merge 函数
import { twMerge } from 'tailwind-merge';

/**
 * cn 工具函数：合并 className 并解决 Tailwind CSS 冲突
 * 先使用 clsx 灵活组合类名（支持条件、数组、对象等多种形式）
 * 再使用 twMerge 智能合并 Tailwind 类（解决如 px-2 和 px-4 冲突）
 * @param inputs 任意数量的类名参数（字符串、数组、对象、条件表达式）
 * @returns 合并后的最终类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  // twMerge(clsx(inputs)) 先组合再去重冲突
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期为中文本地化字符串
 * @param date 日期对象、时间戳或日期字符串
 * @returns 格式化后的日期时间字符串（格式：YYYY/MM/DD HH:mm）
 */
export function formatDate(date: Date | string | number): string {
  // 将输入统一转为 Date 对象
  const d = new Date(date);
  // 返回中文本地化格式
  return d.toLocaleDateString('zh-CN', {
    // 年份：数字格式
    year: 'numeric',
    // 月份：两位数字
    month: '2-digit',
    // 日期：两位数字
    day: '2-digit',
    // 小时：两位数字（24小时制）
    hour: '2-digit',
    // 分钟：两位数字
    minute: '2-digit',
  });
}

/**
 * 格式化数字为中文本地化字符串（千分位分隔）
 * @param num 需要格式化的数字
 * @returns 带千分位的数字字符串
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

/**
 * 格式化文件大小为人类可读字符串
 * @param bytes 文件字节数
 * @returns 格式化后的文件大小字符串（如 "1.23 MB"）
 */
export function formatFileSize(bytes: number): string {
  // 零字节特殊处理
  if (bytes === 0) return '0 B';
  // 定义 1KB = 1024 字节
  const k = 1024;
  // 定义单位数组
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  // 计算最大单位索引：log(bytes) / log(k) 向下取整
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // 按单位转换并保留两位小数
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
```

## 5. 兼容性与影响

- **依赖要求**：组件库依赖 `@radix-ui/react-*`、`class-variance-authority`、`clsx`、`tailwind-merge`、`lucide-react` 等第三方库，需确保 `package.json` 中已正确安装。
- **Tailwind CSS 主题**：组件使用了 `bg-primary`、`text-card-foreground`、`bg-accent` 等语义化 Tailwind 类，需要在 `tailwind.config.ts` 中配置对应的 CSS 变量（通常通过 CSS 变量 + `@apply` 或 `theme.extend.colors` 实现）。
- **全局样式**：组件依赖 `@layer base` 中定义的 CSS 变量（如 `--primary`、`--accent` 等），需确保全局样式文件中已定义这些变量。
- **TypeScript**：组件全部使用 TypeScript 编写，提供完整的类型定义，使用时无需额外安装 `@types/*`。
- **浏览器兼容性**：基于 Radix UI 的无障碍原语，支持所有主流现代浏览器（Chrome、Firefox、Safari、Edge 最新两个版本）。

## 6. 相关源码路径

| 模块 | 路径 |
|------|------|
| Button 组件 | `apps/frontend/src/components/ui/button.tsx` |
| Card 组件族 | `apps/frontend/src/components/ui/card.tsx` |
| DropdownMenu 组件 | `apps/frontend/src/components/ui/dropdown-menu.tsx` |
| ScrollArea 组件 | `apps/frontend/src/components/ui/scroll-area.tsx` |
| Spinner 组件 | `apps/frontend/src/components/ui/spinner.tsx` |
| 桶导出入口 | `apps/frontend/src/components/ui/index.ts` |
| 分页工具 | `apps/frontend/src/lib/table-pagination.ts` |
| 通用工具 | `apps/frontend/src/lib/utils.ts` |
| Tailwind 配置 | `apps/frontend/tailwind.config.ts` |
| 全局样式/主题 | `apps/frontend/src/app/globals.css` |

---

> 若与仓库最新源码不一致，以源码为准。