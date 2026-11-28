import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { grabFrame, openCamera, scanBarcodes } from "../services/vision.ts";
import { Button } from "./primitives.tsx";

export function Camera({
  kind,
  onRead,
  close,
}: {
  kind: "photo" | "barcode";
  onRead: (value: string) => void;
  close: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const onReadRef = useRef(onRead);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    panel.current?.querySelector("button")?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);
  useEffect(() => {
    const element = video.current!;
    let active = true;
    let read = false;
    let stop: (() => void) | undefined;
    const opening =
      kind === "photo"
        ? openCamera(element)
        : scanBarcodes(element, (code) => {
            if (!active || read) return;
            read = true;
            onReadRef.current(code);
          });
    opening
      .then((cleanup) => {
        if (active) {
          stop = cleanup;
          setReady(true);
        } else cleanup();
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const name = cause instanceof Error ? cause.name : "";
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Camera access blocked"
            : name === "NotFoundError" || name === "DevicesNotFoundError"
              ? "No camera found"
              : "Camera unavailable",
        );
      });
    return () => {
      active = false;
      stop?.();
      if (element.srcObject instanceof MediaStream) {
        element.srcObject.getTracks().forEach((track) => track.stop());
        element.srcObject = null;
      }
    };
  }, [kind]);

  return (
    <div
      className="scan-camera"
      ref={panel}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="camera-preview" hidden={!!error}>
        <video
          ref={video}
          muted
          playsInline
          aria-label={kind === "photo" ? "Date label preview" : "Barcode preview"}
        />
        {ready && (
          <span
            className={"camera-guide " + (kind === "barcode" ? "barcode-guide" : "")}
            aria-hidden="true"
          />
        )}
        {!ready && !error && <p role="status">Opening camera…</p>}
      </div>
      {error ? (
        <div className="scan-message scan-message-warn" role="alert">
          <strong>{error}</strong>
          <span>
            {error === "Camera access blocked" &&
              "Allow camera access in your browser’s site settings to use it. "}
            {kind === "photo"
              ? "Upload a label photo or enter the date by hand."
              : "Enter the barcode number below."}
          </span>
        </div>
      ) : ready ? (
        <p className="camera-hint">
          {kind === "photo"
            ? "Fit the printed date inside the guide."
            : "Fit the barcode inside the guide. It scans automatically."}
        </p>
      ) : null}
      <div className="row-acts">
        <Button className="btn sec" onClick={close}>
          Close camera
        </Button>
        {kind === "photo" && !error && (
          <Button
            disabled={!ready}
            onClick={() => {
              const element = video.current;
              if (element?.videoWidth) onRead(grabFrame(element));
            }}
          >
            Read date label
          </Button>
        )}
      </div>
    </div>
  );
}
