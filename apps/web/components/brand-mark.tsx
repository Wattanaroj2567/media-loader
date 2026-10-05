import Image from "next/image";

interface BrandMarkProps {
  className?: string;
  size?: number;
}

export function BrandMark({ className, size = 36 }: BrandMarkProps) {
  return (
    <Image
      src="/brand/media-loader-mark.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      className={className}
    />
  );
}
