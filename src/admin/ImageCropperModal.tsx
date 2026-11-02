import React, { useEffect, useRef, useState } from "react";
import {
  CropKind,
  CropTransformState,
  exportCroppedWebp,
  getLockedPreset,
  validateSourceImageFile,
} from "../cropper";

interface ImageCropperModalProps {
  kind: CropKind;
  csrfToken: string;
  onUploaded: (url: string) => void;
  onCancel: () => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  kind,
  csrfToken,
  onUploaded,
  onCancel,
}) => {
  const preset = getLockedPreset(kind);
  const [error, setError] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [transform, setTransform] = useState<CropTransformState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  });
  const [uploading, setUploading] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      validateSourceImageFile(file);
    } catch (err: any) {
      setError(err.message || "Photo too large");
      return;
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(URL.createObjectURL(file));
    setTransform({ zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: transform.offsetX,
      oy: transform.offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setTransform((prev) => ({
      ...prev,
      offsetX: Math.max(-100, Math.min(100, dragStartRef.current!.ox + dx * 0.45)),
      offsetY: Math.max(-100, Math.min(100, dragStartRef.current!.oy + dy * 0.45)),
    }));
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  const handleCropAndUpload = async () => {
    if (!imgRef.current) {
      setError("Please choose a photo first.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const webpBlob = await exportCroppedWebp(imgRef.current, kind, transform);
      const formData = new FormData();
      formData.append("file", webpBlob, "cropped.webp");
      formData.append("kind", kind);
      const resp = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.detail || "Upload failed");
      }
      onUploaded(data.url);
    } catch (err: any) {
      setError(err.message || "Failed to crop and upload photo");
    } finally {
      setUploading(false);
    }
  };

  const previewHeight = 220;
  const previewWidth = Math.round(previewHeight * preset.aspect);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Interactive ${preset.aspectLabel} WebP Image Cropper`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(9, 13, 22, 0.86)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div className="bento-card" style={{ maxWidth: "560px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0 }}>
            Crop & Optimize Photo · Locked <code>{preset.aspectLabel}</code> WebP
          </h3>
          <button type="button" onClick={onCancel} className="mobile-menu-btn">
            ✕
          </button>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 0 }}>
          Aspect ratio is locked to <strong>{preset.aspectLabel}</strong> (max {preset.maxWidth}×{preset.maxHeight}px) and
          automatically converted to compressed <code>.webp</code>.
        </p>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleFileChange}
          aria-label="Choose source image"
          style={{ marginBottom: "0.85rem", width: "100%" }}
        />

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.6rem 0.85rem",
              background: "rgba(239,68,68,0.16)",
              color: "#f87171",
              borderRadius: "0.5rem",
              marginBottom: "0.75rem",
              fontSize: "0.88rem",
            }}
          >
            {error}
          </div>
        )}

        {sourceUrl && (
          <div>
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                width: `${previewWidth}px`,
                height: `${previewHeight}px`,
                margin: "0 auto 0.85rem",
                overflow: "hidden",
                borderRadius: kind === "result" || kind === "testimonial" ? "50%" : "0.75rem",
                border: "3px solid var(--accent-primary)",
                position: "relative",
                touchAction: "none",
                cursor: "grab",
                background: "#0f172a",
              }}
            >
              <img
                ref={imgRef}
                src={sourceUrl}
                alt="Crop live preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `translate(${transform.offsetX * 0.4}px, ${transform.offsetY * 0.4}px) scale(${transform.zoom}) rotate(${transform.rotation}deg)`,
                  transformOrigin: "center center",
                  pointerEvents: "none",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: "0.6rem", marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.85rem" }}>
                Zoom ({transform.zoom.toFixed(1)}x)
                <input
                  type="range"
                  min="1"
                  max="3.5"
                  step="0.05"
                  value={transform.zoom}
                  onChange={(e) => setTransform((p) => ({ ...p, zoom: parseFloat(e.target.value) }))}
                  style={{ width: "100%" }}
                />
              </label>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                <button
                  type="button"
                  className="mobile-menu-btn"
                  onClick={() => setTransform((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))}
                >
                  ↻ Rotate 90°
                </button>
                <button
                  type="button"
                  className="mobile-menu-btn"
                  onClick={() => setTransform({ zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 })}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem" }}>
          <button type="button" onClick={onCancel} className="mobile-menu-btn">
            Cancel
          </button>
          <button
            type="button"
            disabled={!sourceUrl || uploading}
            onClick={handleCropAndUpload}
            className="btn-primary"
          >
            {uploading ? "Converting to WebP..." : `Crop (${preset.aspectLabel}) & Save WebP`}
          </button>
        </div>
      </div>
    </div>
  );
};
