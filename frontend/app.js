// ====== CONFIG ======
const API_BASE = "http://127.0.0.1:8000"; // backend
const ENDPOINT_TRANSPARENT = `${API_BASE}/process/transparent`;

// ====== ELEMENTS ======
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const processBtn = document.getElementById("processBtn");
const statusEl = document.getElementById("status");
const loader = document.getElementById("loader");
const resultBox = document.getElementById("resultBox");
const resultImg = document.getElementById("resultImg");
const downloadBtn = document.getElementById("downloadBtn");

const cameraBtn = document.getElementById("cameraBtn");
const switchBtn = document.getElementById("switchBtn");
const captureBtn = document.getElementById("captureBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const shotPreview = document.getElementById("shotPreview");

// ====== STATE ======
let selectedFile = null;
let stream = null;
let facingMode = "user"; // 'user' (front) or 'environment' (back)
let capturedBlob = null; // when captured from camera
let resultObjectUrl = null;

// ====== HELPERS ======
function setStatus(msg, isError = true) {
  statusEl.style.color = isError ? "#ef4444" : "#16a34a";
  statusEl.textContent = msg || "";
}

function setLoading(isLoading) {
  loader.classList.toggle("hidden", !isLoading);
  processBtn.disabled = isLoading || (!selectedFile && !capturedBlob);
  cameraBtn.disabled = isLoading;
  switchBtn.disabled = isLoading || !stream;
  captureBtn.disabled = isLoading || !stream;
}

function showResult(blob) {
  if (resultObjectUrl) URL.revokeObjectURL(resultObjectUrl);
  resultObjectUrl = URL.createObjectURL(blob);

  resultImg.src = resultObjectUrl;
  downloadBtn.href = resultObjectUrl;
  downloadBtn.download = "transparent.png";

  resultBox.classList.remove("hidden");
}

function hideResult() {
  resultBox.classList.add("hidden");
  resultImg.src = "";
  if (resultObjectUrl) {
    URL.revokeObjectURL(resultObjectUrl);
    resultObjectUrl = null;
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.srcObject = null;
  switchBtn.disabled = true;
  captureBtn.disabled = true;
}

// ====== FILE UPLOAD ======
fileInput.addEventListener("change", () => {
  const f = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
  selectedFile = f;
  capturedBlob = null; // clear captured when user selects file
  shotPreview.classList.add("hidden");
  video.classList.remove("hidden");

  hideResult();

  if (f) {
    fileName.textContent = f.name;
    setStatus("", false);
    processBtn.disabled = false;
  } else {
    fileName.textContent = "No file";
    processBtn.disabled = true;
  }
});

// ====== CAMERA START ======
cameraBtn.addEventListener("click", async () => {
  setStatus("");
  hideResult();
  capturedBlob = null;
  selectedFile = null;
  fileInput.value = "";
  fileName.textContent = "No file";

  // IMPORTANT: stop previous stream first
  stopCamera();

  try {
    // Try with facingMode
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    });

    video.srcObject = stream;
    video.classList.remove("hidden");
    shotPreview.classList.add("hidden");

    switchBtn.disabled = false;
    captureBtn.disabled = false;
    processBtn.disabled = true; // needs capture or upload
    setStatus("Camera started. Click Capture.", false);
  } catch (err) {
    // Common: permission blocked or insecure context
    setStatus(
      "Camera not available. Allow permission. Mobile often needs HTTPS or localhost.",
      true
    );
    console.error(err);
    stopCamera();
  }
});

// ====== SWITCH CAMERA ======
switchBtn.addEventListener("click", async () => {
  facingMode = facingMode === "user" ? "environment" : "user";
  cameraBtn.click(); // restart camera with new facing mode
});

// ====== CAPTURE ======
captureBtn.addEventListener("click", async () => {
  if (!stream) {
    setStatus("Camera not started.", true);
    return;
  }

  try {
    // Wait until video has dimensions
    if (video.videoWidth === 0) {
      setStatus("Camera is still loading. Try again.", true);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);

    // Convert to blob
    capturedBlob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.95)
    );

    if (!capturedBlob) {
      setStatus("Capture failed. Try again.", true);
      return;
    }

    // Show captured preview
    const previewUrl = URL.createObjectURL(capturedBlob);
    shotPreview.src = previewUrl;
    shotPreview.classList.remove("hidden");
    video.classList.add("hidden");

    // Enable process
    processBtn.disabled = false;
    setStatus("Captured! Now click Remove Background.", false);
  } catch (err) {
    setStatus("Capture failed.", true);
    console.error(err);
  }
});

// ====== PROCESS ======
processBtn.addEventListener("click", async () => {
  setStatus("");
  hideResult();

  const form = new FormData();

  // Priority: captured image > uploaded image
  if (capturedBlob) {
    form.append("image", capturedBlob, "capture.jpg");
  } else if (selectedFile) {
    form.append("image", selectedFile);
  } else {
    setStatus("Please upload or capture an image first.", true);
    return;
  }

  try {
    setLoading(true);

    const res = await fetch(ENDPOINT_TRANSPARENT, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      // Try reading JSON error if backend sends it
      let detail = "";
      try {
        const j = await res.json();
        detail = j.detail ? ` - ${j.detail}` : "";
      } catch (_) {}
      throw new Error(`Backend error ${res.status}${detail}`);
    }

    // IMPORTANT: response is PNG bytes, not JSON
    const blob = await res.blob();

    // Some backends might return JSON accidentally
    if (blob.type.includes("application/json")) {
      const txt = await blob.text();
      throw new Error("Backend returned JSON instead of PNG: " + txt);
    }

    showResult(blob);
    setStatus("Done ✅", false);
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Error processing image", true);
  } finally {
    setLoading(false);
  }
});

// ====== CLEANUP ON TAB CLOSE ======
window.addEventListener("beforeunload", () => {
  stopCamera();
  if (resultObjectUrl) URL.revokeObjectURL(resultObjectUrl);
});
