"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Loader2 } from "lucide-react"

// How long to wait between polls while Browserbase is still processing the
// recording. The replay lags the session close by a few seconds; this keeps the
// wait responsive without hammering the route.
const POLL_INTERVAL_MS = 2000

type Status = "loading" | "ready" | "error" | "unsupported"

// Plays back a Browserbase session's recording from its session id. The playlist
// is proxied through /api/replays/[sessionId] (which holds the secret key); this
// polls that route until the recording is ready — it lags the session close —
// then feeds the HLS playlist to hls.js.
export function SessionReplay({ sessionId }: { sessionId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>("loading")

  // Reset to loading when the session changes, so a new id starts polling from
  // scratch rather than showing the previous recording. Adjusting state during
  // render (React's recommended pattern) instead of in the effect below.
  const [renderedSessionId, setRenderedSessionId] = useState(sessionId)
  if (sessionId !== renderedSessionId) {
    setRenderedSessionId(sessionId)
    setStatus("loading")
  }

  useEffect(() => {
    const url = `/api/replays/${sessionId}`
    let cancelled = false
    let hls: Hls | undefined
    let timer: ReturnType<typeof setTimeout> | undefined

    // Poll until the route stops answering 202 (still processing). A 200 means
    // the playlist exists and we can hand the URL to the player.
    const waitForPlaylist = async () => {
      try {
        const res = await fetch(url)
        if (cancelled) return

        if (res.status === 202) {
          timer = setTimeout(waitForPlaylist, POLL_INTERVAL_MS)
          return
        }
        if (!res.ok) {
          setStatus("error")
          return
        }

        play()
      } catch {
        if (!cancelled) setStatus("error")
      }
    }

    // Attach the now-ready playlist to the <video>. Prefer hls.js; fall back to
    // browsers with native HLS (Safari) that can play the manifest directly.
    const play = () => {
      const video = videoRef.current
      if (!video) return

      if (Hls.isSupported()) {
        hls = new Hls()
        hls.loadSource(url)
        hls.attachMedia(video)
        setStatus("ready")
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url
        setStatus("ready")
      } else {
        setStatus("unsupported")
      }
    }

    waitForPlaylist()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      hls?.destroy()
    }
  }, [sessionId])

  return (
    <div className="relative flex size-full items-center justify-center bg-black">
      <video
        ref={videoRef}
        controls
        className="size-full"
        // Hidden until ready so the loading/error note shows through instead of an
        // empty black frame.
        style={{ display: status === "ready" ? "block" : "none" }}
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Preparing recording…</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-muted-foreground">
          This recording couldn&apos;t be loaded.
        </div>
      )}
      {status === "unsupported" && (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-muted-foreground">
          This browser can&apos;t play the recording.
        </div>
      )}
    </div>
  )
}
