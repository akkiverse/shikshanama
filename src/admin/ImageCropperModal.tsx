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
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initOx: number; initOy: number } | null>(null);

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
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initOx: transform.offsetX,
      initOy: transform.offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || !isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setTransform((prev) => ({
      ...prev,
      offsetX: dragStartRef.current!.initOx + dx,
      offsetY: dragStartRef.current!.initOy + dy,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    dragStartRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }
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
      const data = await resp.json().catch(() => ({}));
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

  const previewBoxHeight = 260;
  const previewBoxWidth = Math.min(480, Math.round(previewBoxHeight * preset.aspect));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Interactive ${preset.aspectLabel} WebP Image Cropper`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(7, 9, 14, 0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div className="bento-card" style={{ maxWidth: "580px", width: "100%", background: "#0d121f", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>
            Photo Cropper · <span style={{ color: "var(--accent-secondary)" }}>{preset.aspectLabel}</span>
          </h3>
          <button type="button" onClick={onCancel} className="mobile-menu-btn" style={{ display: "inline-flex" }}>
            ✕
          </button>
        </div>
        <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginTop: 0, lineHeight: 1.5 }}>
          Upload any high-quality photo (up to 25 MB). Pan and zoom below to frame the photo perfectly within the {preset.aspectLabel} crop window.
        </p>

        <div style={{ marginBottom: "1rem" }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            aria-label="Choose source image"
            style={{ width: "100%", padding: "0.55rem", borderRadius: "0.6rem", background: "rgba(255, 255, 255, 0.05)" }}
          />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.65rem 0.95rem",
              background: "rgba(244, 63, 94, 0.18)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              color: "#fb7185",
              borderRadius: "0.65rem",
              marginBottom: "1rem",
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
              onPointerCancel={handlePointerUp}
              style={{
                width: `${previewBoxWidth}px`,
                height: `${previewBoxHeight}px`,
                margin: "0 auto 1.25rem",
                overflow: "hidden",
                borderRadius: kind === "result" || kind === "testimonial" ? "50%" : "1rem",
                border: "2px solid var(--accent-primary)",
                boxShadow: "0 0 24px var(--accent-glow)",
                position: "relative",
                touchAction: "none",
                cursor: isDragging ? "grabbing" : "grab",
                background: "#07090e",
                userSelect: "none",
              }}
            >
              <img
                ref={imgRef}
                src={sourceUrl}
                alt="Crop live preview"
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.zoom}) rotate(${transform.rotation}deg)`,
                  transformOrigin: "center center",
                  pointerEvents: "none",
                  transition: isDragging ? "none" : "transform 0.1s ease",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.25rem", background: "rgba(255, 255, 255, 0.02)", padding: "0.85rem", borderRadius: "0.85rem", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600 }}>
                <span>Zoom & Frame</span>
                <span style={{ color: "var(--accent-secondary)" }}>{transform.zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="0.05"
                value={transform.zoom}
                onChange={(e) => setTransform((p) => ({ ...p, zoom: parseFloat(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="mobile-menu-btn"
                  style={{ display: "inline-flex", fontSize: "0.82rem" }}
                  onClick={() => setTransform((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))}
                >
                  ↻ Rotate 90°
                </button>
                <button
                  type="button"
                  className="mobile-menu-btn"
                  style={{ display: "inline-flex", fontSize: "0.82rem" }}
                  onClick={() => setTransform({ zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 })}
                >
                  Reset Position
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button type="button" onClick={onCancel} className="mobile-menu-btn" style={{ display: "inline-flex" }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!sourceUrl || uploading}
            onClick={handleCropAndUpload}
            className="btn-primary"
          >
            {uploading ? "Compressing & Saving..." : `Crop & Save WebP (${preset.aspectLabel})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
