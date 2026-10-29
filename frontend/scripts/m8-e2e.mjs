import { Client } from "@stomp/stompjs";

const BASE = "http://localhost:8080/api/v1";
const WS_URL = "ws://localhost:8080/ws";
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

  const raw = await res.text();
  let json = null;
  try {
    json = JSON.parse(raw);
  } catch {}
  return { status: res.status, json, text: raw };
}

async function connectStomp(token) {
  return new Promise((resolve, reject) => {
    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 0,
    });
    client.onConnect = () => resolve(client);
    client.onStompError = (f) => {
      console.log("   [STOMP ERROR]", f.body);
      reject(new Error("STOMP ERROR: " + f.body));
    };
    client.onWebSocketClose = (e) => {

      console.log(`   [WS close] code=${e?.code} reason=${e?.reason || "(trống)"}`);
    };
    client.activate();
  });
}

function waitFrame(client, destination, predicate, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const sub = client.subscribe(destination, (m) => {
      try {
        const obj = JSON.parse(m.body);
        if (predicate(obj)) {
          sub.unsubscribe();
          resolve(obj);
        }
      } catch {}
    });
    const timer = setTimeout(
      () => reject(new Error(`timeout chờ frame ${destination}`)),
      timeoutMs,
    );
  });
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

  const selfReq = await req("/friend-request", {
    method: "POST", token: tokens.Nam, body: { receiverId: ids.Nam },
  });
  log(selfReq.status === 400, "tự mời chính mình → 400", `HTTP ${selfReq.status}`);

  const ghost = await req("/friend-request", {
    method: "POST", token: tokens.Nam, body: { receiverId: 999999 },
  });
  log(ghost.status === 404, "mời người không tồn tại → 404", `HTTP ${ghost.status}`);

  const r1 = await req("/friend-request", {
    method: "POST", token: tokens.Nam, body: { receiverId: ids.Trang },
  });
  const reqId1 = Number(r1.text);
  log(r1.status === 201 && Number.isFinite(reqId1) && reqId1 > 0, "Nam → Trang lời mời 201 (body requestId)", `HTTP ${r1.status}, id=${r1.text}`);

  const dup = await req("/friend-request", {
    method: "POST", token: tokens.Nam, body: { receiverId: ids.Trang },
  });
  log(dup.status === 400, "trùng lời mời cùng chiều → 400", `HTTP ${dup.status}`);

  const reverse = await req("/friend-request", {
    method: "POST", token: tokens.Trang, body: { receiverId: ids.Nam },
  });
  log(reverse.status === 400, "lời mời chiều ngược → 400 (existsBetween 2 chiều)", `HTTP ${reverse.status}`);

  const wrongAccept = await req(`/friend-request/${reqId1}/accept`, { method: "POST", token: tokens.Nam });
  log(wrongAccept.status === 403, "người GỬI gọi accept → 403 (chỉ người nhận)", `HTTP ${wrongAccept.status}`);

  const contactsTrang = (await req("/friend-request", { token: tokens.Trang })).json;
  log(
    contactsTrang?.incoming?.some((r) => r.requestId === reqId1 && r.otherName === "Nam"),
    "contacts(Trang): incoming có lời mời của Nam",
  );
  const contactsNam = (await req("/friend-request", { token: tokens.Nam })).json;
  log(
    contactsNam?.outgoing?.some((r) => r.requestId === reqId1 && r.otherName === "Trang")
      && (contactsNam?.friends?.length ?? 0) === 0,
    "contacts(Nam): outgoing có, friends còn rỗng",
  );

  const accept1 = await req(`/friend-request/${reqId1}/accept`, { method: "POST", token: tokens.Trang });
  log(accept1.status === 204, "Trang accept → 204", `HTTP ${accept1.status}`);

  const afterAccept = (await req("/friend-request", { token: tokens.Nam })).json;
  log(
    afterAccept?.friends?.some((f) => String(f.userId) === String(ids.Trang))
      && (afterAccept?.outgoing?.length ?? 1) === 0,
    "contacts(Nam): friends có Trang, outgoing rỗng",
  );

  const badDirect = await req("/conversation", {
    method: "POST", token: tokens.Nam, body: { conversationType: "DIRECT", memberId: [ids.Hung] },
  });
  log(badDirect.status === 403, "DIRECT với người CHƯA kết bạn → 403", `HTTP ${badDirect.status}`);

  const badGroup = await req("/conversation", {
    method: "POST", token: tokens.Nam,
    body: { conversationType: "GROUP", memberId: [ids.Trang, ids.Hung] },
  });
  log(badGroup.status === 403, "GROUP chứa người chưa kết bạn → 403", `HTTP ${badGroup.status}`);

  const group2 = await req("/conversation", {
    method: "POST", token: tokens.Nam, body: { conversationType: "GROUP", memberId: [ids.Trang] },
  });
  const groupId2 = group2.json?.id;
  log(group2.status === 201 && Boolean(groupId2), "GROUP chỉ toàn bạn bè → 201", `id=${groupId2}`);

  const addNotFriend = await req(`/conversation-member?conversationId=${groupId2}`, {
    method: "POST", token: tokens.Trang, body: { userId: ids.Hung },
  });
  log(addNotFriend.status === 403, "thêm CHƯA-kết-bạn vào nhóm → 403", `HTTP ${addNotFriend.status}`);

  const r2 = await req("/friend-request", {
    method: "POST", token: tokens.Trang, body: { receiverId: ids.Hung },
  });
  const reqId2 = Number(r2.text);
  const accept2 = await req(`/friend-request/${reqId2}/accept`, { method: "POST", token: tokens.Hung });
  log(r2.status === 201 && accept2.status === 204, "Trang → Hung lời mời 201 + accept 204", `req=${reqId2}`);

  const addHung = await req(`/conversation-member?conversationId=${groupId2}`, {
    method: "POST", token: tokens.Trang, body: { userId: ids.Hung },
  });
  log(addHung.status === 201 || addHung.status === 200, "Trang (đã là bạn Hung) thêm Hung vào nhóm → OK", `HTTP ${addHung.status}`);

  const srcBlocked = await req("/friend-request", {
    method: "POST", token: tokens.Nam,
    body: { receiverId: ids.Hung, sourceConversationId: groupId2 },
  });

  const reqId3 = Number(srcBlocked.text);
  log(srcBlocked.status === 201, "Nam mời Hung QUA NHÓM (cả hai là thành viên) → 201", `HTTP ${srcBlocked.status}, id=${srcBlocked.text}`);

  const hungContacts = (await req("/friend-request", { token: tokens.Hung })).json;
  const inc = hungContacts?.incoming?.find((r) => r.requestId === reqId3);
  log(
    Boolean(inc)
      && String(inc.sourceConversationId) === String(groupId2)
      && typeof inc.sourceName === "string"
      && inc.sourceName.includes("Trang"),
    "contacts(Hung): lời mời có nguồn nhóm + sourceName đúng",
    inc?.sourceName ?? "không có",
  );

  const hungWs = await connectStomp(tokens.Hung);
  const sendRest4 = Promise.resolve().then(async () => {

    await req(`/friend-request/${reqId3}`, { method: "DELETE", token: tokens.Nam });
    const r = await req("/friend-request", {
      method: "POST", token: tokens.Nam,
      body: { receiverId: ids.Hung, sourceConversationId: groupId2 },
    });
    return r;
  });
  try {
    const frame = await waitFrame(
      hungWs,
      "/topic/contacts",
      (e) => e.kind === "request" && String(e.senderId) === String(ids.Nam),
    );
    log(
      frame.sourceConversationId != null
        && typeof frame.sourceName === "string"
        && frame.sourceName.includes("Trang"),
      "WS contacts → frame {kind:request} có sourceName nhóm",
      JSON.stringify(frame),
    );
    const srcAgain = await sendRest4;
    log(srcAgain.status === 201, "Nam mời lại qua nhóm sau khi thu hồi → 201", `HTTP ${srcAgain.status}`);
    globalThis.__reqId4 = Number(srcAgain.text);
  } catch (e) {
    log(false, `WS contacts frame request — ${e.message}`);
  }

  const namWs = await connectStomp(tokens.Nam);
  try {
    const acceptRest = Promise.resolve(
      req(`/friend-request/${globalThis.__reqId4}/accept`, { method: "POST", token: tokens.Hung }),
    );
    const accepted = await waitFrame(
      namWs,
      "/topic/contacts",
      (e) => e.kind === "accepted" && String(e.friendId) === String(ids.Hung),
    );
    log(Boolean(accepted), "WS contacts → frame {kind:accepted} cho người gửi", JSON.stringify(accepted));
    await acceptRest;
  } catch (e) {
    log(false, `WS contacts frame accepted — ${e.message}`);
  }

  const namFriends = (await req("/friend-request", { token: tokens.Nam })).json;
  log(
    namFriends?.friends?.some((f) => String(f.userId) === String(ids.Hung)),
    "sau accept: Nam friends có Hung",
  );

  try {
    const msg = await req(`/message?conversationId=${groupId2}`, {
      method: "POST", token: tokens.Nam, body: { messageContent: "Tin bị xóa để test tombstone" },
    });
    const msgId = msg.json?.id;
    log(msg.status === 201 && Boolean(msgId), "tạo tin trong nhóm để test xóa", `id=${msgId}`);

    const delRest = Promise.resolve(req(`/message/${msgId}`, { method: "DELETE", token: tokens.Nam }));
    const frame = await waitFrame(
      hungWs,
      `/topic/conversation/${groupId2}`,
      (e) => e.kind === "messageDeleted" && e.messageId === msgId,
    );
    log(
      String(frame.deleterName) === "Nam",
      "WS conversation → frame {kind:messageDeleted} deleterName đúng",
      JSON.stringify(frame),
    );
    await delRest;
  } catch (e) {
    log(false, `WS messageDeleted frame — ${e.message}`);
  }

  const rMai = await req("/friend-request", {
    method: "POST", token: tokens.Nam, body: { receiverId: ids.Mai },
  });
  const reqIdMai = Number(rMai.text);
  const wrongDecline = await req(`/friend-request/${reqIdMai}/decline`, { method: "POST", token: tokens.Hung });
  log(wrongDecline.status === 403, "Hung (không phải người nhận) decline → 403", `HTTP ${wrongDecline.status}`);
  const declineMai = await req(`/friend-request/${reqIdMai}/decline`, { method: "POST", token: tokens.Mai });
  log(declineMai.status === 204, "Mai decline → 204 (xóa hàng)", `HTTP ${declineMai.status}`);

  const rMai2 = await req("/friend-request", {
    method: "POST", token: tokens.Nam, body: { receiverId: ids.Mai },
  });
  const reqIdMai2 = Number(rMai2.text);
  log(rMai2.status === 201, "mời lại sau decline được (201)", `id=${reqIdMai2}`);
  const cancelMai = await req(`/friend-request/${reqIdMai2}`, { method: "DELETE", token: tokens.Nam });
  log(cancelMai.status === 204, "Nam thu hồi (cancel) → 204", `HTTP ${cancelMai.status}`);

  const maiContacts = (await req("/friend-request", { token: tokens.Mai })).json;
  log(
    (maiContacts?.incoming?.length ?? 1) === 0 && (maiContacts?.friends?.length ?? 1) === 0,
    "contacts(Mai) sạch sau decline/cancel",
  );

  hungWs.deactivate();
  namWs.deactivate();

  console.log("\n===== KẾT QUẢ M8 =====");
  for (const line of results) console.log(line);
  const fails = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(`\n${results.length - fails}/${results.length} PASS`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error("CRASH:", e);
  console.log("\n===== KẾT QUẢ M8 =====");
  for (const line of results) console.log(line);
  process.exit(2);
});
