declare module "react-pageflip" {
  import type { CSSProperties, ReactNode, Ref } from "react";

  export type PageFlipState = "user_fold" | "fold_corner" | "flipping" | "read";
  export type PageOrientation = "portrait" | "landscape";

  export type PageFlipEvent = {
    data: number;
    object: unknown;
  };

  export type HTMLFlipBookProps = {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    renderOnlyPageLengthChange?: boolean;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
    onFlip?: (e: PageFlipEvent) => void;
    onChangeOrientation?: (e: { data: PageOrientation }) => void;
    onChangeState?: (e: { data: PageFlipState }) => void;
    onInit?: (e: { data: { page: number; mode: PageOrientation } }) => void;
    onUpdate?: (e: { data: { page: number; mode: PageOrientation } }) => void;
    ref?: Ref<{ pageFlip: () => PageFlipController | undefined }>;
  };

  export type PageFlipController = {
    getPageCount: () => number;
    getCurrentPageIndex: () => number;
    flipNext: (corner?: "top" | "bottom") => void;
    flipPrev: (corner?: "top" | "bottom") => void;
    turnToPage: (page: number) => void;
    flip: (page: number, corner?: "top" | "bottom") => void;
  };

  const HTMLFlipBook: React.FC<HTMLFlipBookProps>;
  export default HTMLFlipBook;
}
