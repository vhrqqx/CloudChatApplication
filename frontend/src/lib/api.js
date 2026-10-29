const TOKEN_KEY = "cloudchat-token";

export class ApiError extends Error {
  constructor(status, message, validationErrors) {
    super(message || `Lỗi máy chủ (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.validationErrors = validationErrors || null;
  }
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {

  }
}
export function clearToken() {
  setToken(null);
}

export async function api(path, { method = "GET", body, signal } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers,
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Không thể kết nối đến máy chủ.");
  }

  if (res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {

  }

  if (res.status === 401 && token) onUnauthorized?.();
  throw new ApiError(res.status, payload?.message, payload?.validationErrors);
}

export function uploadFile(conversationId, file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/v1/attachment?conversationId=${encodeURIComponent(conversationId)}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "text";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError(0, "Không thể kết nối đến máy chủ."));
    xhr.onabort = () => reject(new ApiError(0, "Đã hủy tải lên."));
    xhr.onload = () => {
      let payload = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {

      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
        return;
      }
      if (xhr.status === 401 && token) onUnauthorized?.();
      reject(
        new ApiError(
          xhr.status,
          payload?.message,
          payload?.validationErrors,
        ),
      );
    };
    const fd = new FormData();
    fd.append("file", file, file.name);
    xhr.send(fd);
  });
}

export async function apiBinary(path) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api/v1${path}`, { headers });
  } catch {
    throw new ApiError(0, "Không thể kết nối đến máy chủ.");
  }
  if (res.ok) return res.blob();

  let payload = null;
  try {
    payload = await res.json();
  } catch {}
  if (res.status === 401 && token) onUnauthorized?.();
  throw new ApiError(res.status, payload?.message);
}
