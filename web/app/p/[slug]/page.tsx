import Link from "next/link";
import { notFound } from "next/navigation";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { ShareCopyButton } from "./ShareCopyButton";
import type { PublicShareData, ShareResponse } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchShare(slug: string): Promise<PublicShareData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/share/${slug}`, {
      // Public, cacheable
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ShareResponse;
    return body.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchShare(slug);
  const title = data
    ? `Photo enhancement prompt by PoseLab`
    : "PoseLab — shared photo";
  return {
    title,
    description: data?.prompt?.slice(0, 160) ?? "Shared PoseLab result.",
    openGraph: {
      title,
      description: data?.prompt?.slice(0, 160) ?? "Shared PoseLab result.",
      images: data?.enhanced_url
        ? [data.enhanced_url]
        : data?.image_url
          ? [data.image_url]
          : [],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchShare(slug);
  if (!data) notFound();

  const shareUrl = `${process.env.NEXT_PUBLIC_WEB_BASE_URL ?? ""}/p/${slug}`;

  return (
    <div className="flex min-h-dvh flex-col">
      <nav className="w-full px-5 sm:px-8 pt-6 pb-2">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="font-semibold tracking-tight text-foreground text-lg"
          >
            PoseLab
          </Link>
          <Link
            href="/enhance"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Try it →
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full px-5 sm:px-8 pb-24">
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-7 pt-6 sm:pt-8">
          <header className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-accent">
              Shared via PoseLab
            </span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
              Photo enhancement prompt
            </h1>
            {!data.is_paid && (
              <p className="text-xs text-muted">
                Made on the free tier — includes PoseLab branding.
              </p>
            )}
          </header>

          {data.enhanced_url ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium uppercase tracking-widest text-muted">
                Before / after
              </h2>
              <BeforeAfterSlider
                beforeSrc={data.image_url}
                afterSrc={data.enhanced_url}
              />
            </section>
          ) : (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium uppercase tracking-widest text-muted">
                Original
              </h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.image_url}
                alt="Original"
                className="w-full rounded-2xl border border-border bg-black object-contain max-h-[70vh]"
              />
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted">
              Prompt
            </h2>
            <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
              <p className="text-base leading-7 text-foreground whitespace-pre-wrap">
                {data.prompt}
              </p>
              <ShareCopyButton text={data.prompt} label="Copy prompt" />
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-base font-semibold">Try this on your own photo</h3>
            <p className="text-sm text-muted leading-6">
              PoseLab analyzes any photo and writes a paste-ready prompt for
              ChatGPT, Gemini, or in-app generation. Free to try.
            </p>
            <Link
              href="/enhance"
              className="
                self-start inline-flex items-center justify-center
                h-11 px-5
                rounded-full
                bg-accent text-black font-medium text-sm
                hover:bg-accent-hover transition-colors
              "
            >
              Upload your photo →
            </Link>
          </section>

          <footer className="text-xs text-muted text-center">
            Shared link:{" "}
            <code className="bg-surface border border-border rounded px-1.5 py-0.5">
              {shareUrl}
            </code>
          </footer>
        </div>
      </main>
    </div>
  );
}
