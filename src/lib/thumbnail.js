// 업로드한 이미지·영상의 썸네일을 브라우저에서 직접 만든다. R2에는 이미지 변환
// 기능이 없으므로, 원본과 함께 작은 JPEG을 하나 더 올려 갤러리에서 그것만 받는다.
// 만들지 못하는 형식(HEIC 등 캔버스가 못 그리는 것)은 조용히 null을 돌려주고
// 갤러리는 일반 파일 아이콘으로 대체한다.

const MAX_EDGE = 400;
const QUALITY = 0.8;

export const isImage = (mime) => typeof mime === "string" && mime.startsWith("image/");
export const isVideo = (mime) => typeof mime === "string" && mime.startsWith("video/");

// 긴 변이 MAX_EDGE를 넘지 않도록 비율을 유지한 채 캔버스에 그려 JPEG blob으로 만든다.
function drawToBlob(source, width, height) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
}

function imageThumbnail(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const blob = await drawToBlob(img, img.naturalWidth, img.naturalHeight).catch(() => null);
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

// 영상은 앞부분 한 프레임을 캡처한다. 맨 첫 프레임이 검은 화면인 경우가 많아
// 재생 길이의 10% 지점(최대 1초)으로 살짝 넘긴 뒤 그 프레임을 쓴다.
function videoThumbnail(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const done = (blob) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(blob);
    };

    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 0) * 0.1);
    };
    video.onseeked = async () => {
      const blob = await drawToBlob(video, video.videoWidth, video.videoHeight).catch(() => null);
      done(blob);
    };
    video.onerror = () => done(null);
    // 메타데이터조차 읽지 못하고 매달리는 형식이 있어 상한을 둔다.
    setTimeout(() => done(null), 10000);
    video.src = url;
  });
}

export async function makeThumbnail(file) {
  try {
    if (isImage(file.type)) return await imageThumbnail(file);
    if (isVideo(file.type)) return await videoThumbnail(file);
  } catch {
    /* 썸네일은 있으면 좋은 것이므로 실패해도 업로드 자체는 진행한다 */
  }
  return null;
}
