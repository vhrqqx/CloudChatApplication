const BASE = "http://localhost:8080/api/v1";
const results = [];

function log(ok, label, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " — " + detail : ""}`);
}

async function req(path, { method = "GET", token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json, headers: res.headers };
}

async function main() {

  const users = [
    { username: "Nam", userEmail: "nam@test.vn", password: "matkhau12345" },
    { username: "Trang", userEmail: "trang@test.vn", password: "matkhau67890" },
    { username: "Hung", userEmail: "hung@test.vn", password: "matkhau24680" },
    { username: "Mai", userEmail: "mai@test.vn", password: "matkhau13579" },
  ];
  for (const u of users) await req("/auth/register", { method: "POST", body: u });

  const tokens = {};
  const ids = {};
  for (const u of users) {
    const r = await req("/auth/login", {
      method: "POST",
      body: { userEmail: u.userEmail, password: u.password },
    });
    tokens[u.username] = r.json?.accessToken;
    ids[u.username] = r.json?.user?.id;
  }
  log(tokens.Nam && tokens.Trang && tokens.Hung && tokens.Mai, "login 4 users");

  const group = await req("/conversation", {
    method: "POST",
    token: tokens.Nam,
    body: { conversationType: "GROUP", memberId: [ids.Trang, ids.Hung] },
  });
  const groupId = group.json?.id;
  log(Boolean(groupId), "GROUP sẵn sàng", `id=${groupId}`);

  const textMsg = await req(`/message?conversationId=${groupId}`, {
    method: "POST",
    token: tokens.Nam,
    body: { messageContent: "Tin gốc chưa sửa" },
  });
  const mid = textMsg.json?.id;
  log(textMsg.status === 201 && Boolean(mid), "tạo tin TEXT gốc", `id=${mid}`);

  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP0z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const fd = new FormData();
  fd.append("file", new Blob([pngBytes], { type: "image/png" }), "anh-test.png");
  const up = await fetch(`${BASE}/attachment?conversationId=${groupId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.Trang}` },
    body: fd,
  });
  const att = await up.json().catch(() => null);
  log(up.status === 201, "upload multipart 201", `HTTP ${up.status}`);
  log(
    att?.id != null &&
      att?.filename === "anh-test.png" &&
      att?.contentType === "image/png" &&
      att?.size === pngBytes.length &&
      typeof att?.downloadUrl === "string",
    "AttachmentResponse đủ trường",
    JSON.stringify(att),
  );

  log(up.status === 201, "Trang (MEMBER) upload được — isMember rule", `HTTP ${up.status}`);

  let page = (await req(`/message?conversationId=${groupId}&page=0&size=50`, { token: tokens.Nam })).json;
  const attMsg = (page?.content ?? []).find((m) => m.content === "[File:anh-test.png]");
  log(
    Boolean(attMsg) && String(attMsg.senderId) === String(ids.Trang),
    "upload tạo Message [File:anh-test.png]",
    attMsg ? `msgId=${attMsg.id}` : "không thấy",
  );

  const editOther = await req(`/message/${mid}?conversationId=${groupId}`, {
    method: "PATCH",
    token: tokens.Trang,
    body: { content: "Trang sửa hộ" },
  });
  log(editOther.status === 403, "Trang sửa tin CỦA Nam bị chặn 403", `HTTP ${editOther.status}`);

  const edited = await req(`/message/${mid}`, {
    method: "PATCH",
    token: tokens.Nam,
    body: { content: "Tin đã được sửa" },
  });
  log(edited.status === 200 && edited.json?.content === "Tin đã được sửa", "Nam sửa tin của mình 200", `HTTP ${edited.status}`);

  const editEmpty = await req(`/message/${mid}`, {
    method: "PATCH",
    token: tokens.Nam,
    body: { content: "   " },
  });
  log(editEmpty.status === 400, "PATCH nội dung rỗng bị chặn 400", `HTTP ${editEmpty.status}`);

  const editAtt = await req(`/message/${attMsg?.id}`, {
    method: "PATCH",
    token: tokens.Trang,
    body: { content: "hi" },
  });
  log(editAtt.status === 400, "sửa tin đính kèm bị chặn 400", `HTTP ${editAtt.status}`);

  const dl = await fetch(att?.downloadUrl ? BASE.slice(0, -7) + att.downloadUrl : `${BASE}/attachment/${att?.id}/download`, {
    headers: { Authorization: `Bearer ${tokens.Nam}` },
  });
  const dlBytes = Buffer.from(await dl.arrayBuffer());
  log(dl.status === 200 && dlBytes.equals(pngBytes), "download khớp bytes (Bearer)", `HTTP ${dl.status}, ${dlBytes.length}B`);
  log(
    (dl.headers.get("content-disposition") ?? "").includes("UTF-8"),
    "Content-Disposition UTF-8 filename",
    dl.headers.get("content-disposition"),
  );

  const dlNoAuth = await fetch(`${BASE}/attachment/${att?.id}/download`);
  log(dlNoAuth.status === 401, "download không token → 401", `HTTP ${dlNoAuth.status}`);

  const mz = new FormData();
  mz.append("file", new Blob([Buffer.from("4d5a90000300000004000000ffff", "hex")], { type: "application/octet-stream" }), "virus.exe");
  const bad = await fetch(`${BASE}/attachment?conversationId=${groupId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.Trang}` },
    body: mz,
  });
  log(bad.status === 400, "upload .exe bị từ chối 400", `HTTP ${bad.status}, msg: ${(await bad.json().catch(() => null))?.message}`);

  const delAtt = await req(`/attachment/${att?.id}?conversationId=${groupId}`, {
    method: "DELETE",
    token: tokens.Nam,
  });
  log(delAtt.status === 204, "ADMIN xóa tệp của thành viên khác 204", `HTTP ${delAtt.status}`);

  const delForeign = await req(`/message/${mid}`, {
    method: "DELETE",
    token: tokens.Hung,
  });
  log(delForeign.status === 403, "Hung xóa tin người khác (không ADMIN) 403", `HTTP ${delForeign.status}`);

  const del = await req(`/message/${mid}`, { method: "DELETE", token: tokens.Nam });
  log(del.status === 204, "Nam xóa tin của mình 204", `HTTP ${del.status}`);

  const delAgain = await req(`/message/${mid}`, { method: "DELETE", token: tokens.Nam });
  log(delAgain.status === 404, "xóa lần nữa → 404", `HTTP ${delAgain.status}`);
  const editDeleted = await req(`/message/${mid}`, {
    method: "PATCH",
    token: tokens.Nam,
    body: { content: "sửa tin đã xóa" },
  });
  log(editDeleted.status === 404, "sửa tin đã xóa → 404", `HTTP ${editDeleted.status}`);

  const rename = await req("/user/me", { method: "PATCH", token: tokens.Nam, body: { username: "Nam Hung" } });
  log(rename.status === 200 && rename.json?.username === "Nam Hung", "PATCH /user/me đổi tên 200", `HTTP ${rename.status}`);

  const renameLong = await req("/user/me", { method: "PATCH", token: tokens.Nam, body: { username: "x".repeat(60) } });
  log(renameLong.status === 400, "tên 60 ký tự → 400", `HTTP ${renameLong.status}`);
  await req("/user/me", { method: "PATCH", token: tokens.Nam, body: { username: "Nam" } });

  const wrongPwd = await req("/user/me/password", {
    method: "PUT",
    token: tokens.Mai,
    body: { currentPassword: "sai-roi-nhe", newPassword: "matkhaumoi9999" },
  });
  log(
    wrongPwd.status === 400 && (wrongPwd.json?.message ?? "").includes("Mật khẩu hiện tại không đúng"),
    "đổi mật khẩu sai current → 400 + message tiếng Việt",
    `HTTP ${wrongPwd.status}, ${(wrongPwd.json?.message ?? "").slice(0, 40)}`,
  );

  const shortPwd = await req("/user/me/password", {
    method: "PUT",
    token: tokens.Mai,
    body: { currentPassword: "matkhau13579", newPassword: "ngan" },
  });
  log(shortPwd.status === 400, "mật khẩu mới <8 ký tự → 400", `HTTP ${shortPwd.status}`);

  const okPwd = await req("/user/me/password", {
    method: "PUT",
    token: tokens.Mai,
    body: { currentPassword: "matkhau13579", newPassword: "matkhaumoi9999" },
  });
  log(okPwd.status === 204, "đổi mật khẩu đúng → 204", `HTTP ${okPwd.status}`);

  const stale = await req("/auth/me", { token: tokens.Mai });
  log(stale.status === 401, "token cũ sau đổi mật khẩu → 401", `HTTP ${stale.status}`);

  const relogin = await req("/auth/login", {
    method: "POST",
    body: { userEmail: "mai@test.vn", password: "matkhaumoi9999" },
  });
  log(relogin.status === 200 && Boolean(relogin.json?.accessToken), "đăng nhập mật khẩu MỚI OK");
  const oldPwdLogin = await req("/auth/login", {
    method: "POST",
    body: { userEmail: "mai@test.vn", password: "matkhau13579" },
  });
  log(oldPwdLogin.status === 401, "đăng nhập mật khẩu CŨ → 401", `HTTP ${oldPwdLogin.status}`);

  const delAcc = await req("/user/me", { method: "DELETE", token: relogin.json.accessToken });
  log(delAcc.status === 204, "DELETE /user/me → 204", `HTTP ${delAcc.status}`);

  const deadToken = await req("/auth/me", { token: relogin.json.accessToken });
  log(deadToken.status === 401, "token sau xóa tài khoản → 401", `HTTP ${deadToken.status}`);

  const ghost = await req(`/user/${ids.Mai}`, { token: tokens.Nam });
  log(ghost.status === 404, "profile người đã xóa → 404 (isDeletedFalse)", `HTTP ${ghost.status}`);

  console.log(results.join("\n"));
  const fails = results.filter((r) => r.startsWith("FAIL"));
  process.exit(fails.length ? 1 : 0);
}

await main();
