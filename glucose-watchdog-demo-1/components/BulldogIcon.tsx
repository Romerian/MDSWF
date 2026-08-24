import Image from "next/image";

export function BulldogIcon() {
  return (
    <Image
      className="bulldog"
      src="/english-bulldog.png"
      width={46}
      height={46}
      alt="English bulldog"
      priority
    />
  );
}
