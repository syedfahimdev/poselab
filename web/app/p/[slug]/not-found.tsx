import Link from "next/link";

export default function ShareNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      <div className="flex max-w-md flex-col gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          That share is gone.
        </h1>
        <p className="text-base text-muted leading-7">
          The link may have expired or the owner deleted it.
        </p>
        <Link
          href="/enhance"
          className="
            self-center inline-flex items-center justify-center
            h-11 px-5
            rounded-full
            bg-accent text-black font-medium text-sm
            hover:bg-accent-hover transition-colors
          "
        >
          Make your own
        </Link>
      </div>
    </main>
  );
}
