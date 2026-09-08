"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

// Each auth page gets its own backdrop and caption.
const SCENES: Record<string, { image: string; title: string; body: string }> = {
  "/login": {
    image: "/login-hero2.avif",
    title: "Weekly reporting,\nwithout the chasing",
    body: "Team members submit structured updates. Managers review and see the whole team at a glance.",
  },
  "/register": {
    image: "/register-hero4.jpeg",
    title: "Start reporting\nin under a minute",
    body: "Create your account, pick your week, and submit your first update. Your manager sees it the moment you do.",
  },
};

const FALLBACK = SCENES["/login"];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const scene = SCENES[pathname] ?? FALLBACK;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
      {/* One backdrop covering the whole page, dimmed. */}
      <div className="absolute inset-0 -z-10">
        <Image
          key={scene.image}
          src={scene.image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a1259]/80 via-[#4c1d95]/70 to-[#12101f]/90" />
      </div>

      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl bg-white/95 shadow-2xl">
        {/* Framed window onto the same image. Three stacked layers: a clipped
            white shape (the frame), a smaller clipped container holding a
            viewport-fixed copy of the backdrop, and the caption on top. */}
        <div className="relative hidden w-[46%] p-4 lg:block">
          <div className="relative h-full min-h-[34rem] w-full">
            <div
              className="absolute inset-0 bg-white"
              style={{
                clipPath:
                  "polygon(0% 4%, 3% 0%, 88% 0%, 100% 13%, 100% 87%, 92% 100%, 3% 100%, 0% 96%)",
              }}
            />

            <div
              className="absolute inset-[11px]"
              style={{
                clipPath:
                  "polygon(0% 4%, 3% 0%, 87% 0%, 100% 13%, 100% 87%, 91% 100%, 3% 100%, 0% 96%)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${scene.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundAttachment: "fixed",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />

              <div className="absolute inset-0 flex flex-col justify-end p-7 pr-12">
                <h2 className="whitespace-pre-line text-xl font-semibold leading-snug tracking-tight text-white">
                  {scene.title}
                </h2>
                <p className="mt-2.5 max-w-[16rem] text-sm leading-relaxed text-white/85">
                  {scene.body}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-[54%] lg:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-7 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-bold text-white shadow-sm">
                W
              </span>
              <span className="text-base font-semibold tracking-tight text-ink">
                Weekly Reports
              </span>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}