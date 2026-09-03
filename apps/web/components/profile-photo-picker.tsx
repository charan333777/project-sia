"use client";

import { Camera, ImagePlus, LockKeyhole, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const OUTPUT_SIZE = 512;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("We couldn’t prepare that photo.")),
      "image/webp",
      0.86,
    );
  });
}

async function cropImage(file: File) {
  if (!file.type.startsWith("image/") || file.size > MAX_SOURCE_BYTES) {
    throw new Error("Choose an image smaller than 12 MB.");
  }
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("We couldn’t open that image."));
      element.src = imageUrl;
    });
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("We couldn’t prepare that photo.");
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    return await canvasBlob(canvas);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function ProfilePhotoPicker({
  previewUrl,
  onPhotoSelected,
  onRemove,
}: {
  previewUrl: string | null;
  onPhotoSelected: (photo: Blob) => void;
  onRemove: () => void;
}) {
  const chooseInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState("");

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
  };

  useEffect(() => {
    if (!cameraOpen) return;
    let active = true;
    void navigator.mediaDevices?.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    }).then((stream) => {
      if (!active) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      }
    }).catch(() => {
      if (!active) return;
      setError("Camera access wasn’t available. You can choose a photo instead.");
      closeCamera();
      cameraInputRef.current?.click();
    });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  const useFile = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      onPhotoSelected(await cropImage(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t prepare that photo.");
    }
  };

  const openCamera = () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    setCameraOpen(true);
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const sourceSize = Math.min(video.videoWidth, video.videoHeight);
    const sourceX = (video.videoWidth - sourceSize) / 2;
    const sourceY = (video.videoHeight - sourceSize) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.translate(OUTPUT_SIZE, 0);
    context.scale(-1, 1);
    context.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    const photo = await canvasBlob(canvas);
    closeCamera();
    onPhotoSelected(photo);
  };

  return (
    <div className="profile-photo-picker">
      <input ref={chooseInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/*" tabIndex={-1} aria-hidden="true" onChange={(event) => { void useFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <input ref={cameraInputRef} className="visually-hidden" type="file" accept="image/*" capture="user" tabIndex={-1} aria-hidden="true" onChange={(event) => { void useFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />

      <div className={`profile-photo-preview ${previewUrl ? "profile-photo-preview-filled" : ""}`}>
        {previewUrl ? <img src={previewUrl} alt="Your selected profile" /> : <Camera size={34} aria-hidden="true" />}
      </div>
      <div className="profile-photo-actions">
        <button type="button" className="photo-action photo-action-primary" onClick={openCamera}><Camera size={17} />{previewUrl ? "Retake" : "Take a photo"}</button>
        <button type="button" className="photo-action" onClick={() => chooseInputRef.current?.click()}><ImagePlus size={17} />Choose from device</button>
      </div>
      {previewUrl && <button type="button" className="photo-remove" onClick={onRemove}><Trash2 size={15} /> Remove photo</button>}
      <p className="photo-privacy"><LockKeyhole size={13} /> Shown on your profile and QR card when visible.</p>
      {error && <p className="field-error photo-error" role="alert">{error}</p>}

      {cameraOpen && (
        <div className="camera-backdrop" role="dialog" aria-modal="true" aria-labelledby="camera-heading">
          <div className="camera-dialog">
            <button type="button" className="camera-close" aria-label="Close camera" onClick={closeCamera}><X /></button>
            <span className="eyebrow">Style · My photo</span>
            <h2 id="camera-heading">Take a photo</h2>
            <div className="camera-stage">
              <video ref={videoRef} muted playsInline onCanPlay={() => setCameraReady(true)} />
              <span className="camera-guide" aria-hidden="true" />
              {!cameraReady && <span className="camera-loading">Opening camera…</span>}
            </div>
            <p>Keep your face inside the guide.</p>
            <button type="button" className="camera-shutter" aria-label="Take photo" disabled={!cameraReady} onClick={() => void capture()}><Camera size={24} /></button>
            <button type="button" className="camera-fallback" onClick={() => { closeCamera(); chooseInputRef.current?.click(); }}><RotateCcw size={15} /> Choose from device instead</button>
          </div>
        </div>
      )}
    </div>
  );
}
