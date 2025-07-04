"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="w-full border-b bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/next.svg" alt="Logo" width={24} height={24} className="dark:invert" />
          <span className="font-semibold">Unstructured Platform</span>
        </div>
      </div>
    </header>
  );
}
