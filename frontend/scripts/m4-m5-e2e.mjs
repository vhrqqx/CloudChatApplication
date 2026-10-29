




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
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let json = null;
  try { json = JSON.parse(raw); } catch {}
  return { status: res.status, json, text: raw };
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
    const r = await req("/auth/login", { method: "POST", body: { userEmail: u.userEmail, password: u.password } });
    tokens[u.username] = r.json?.accessToken;
    ids[u.username] = r.json?.user?.id;
  }
  log(tokens.Nam && tokens.Trang, "login 4 users", `ids: Nam=${ids.Nam} Trang=${ids.Trang} Hung=${ids.Hung} Mai=${ids.Mai}`);


  const pairs = [
    ["Nam", "Trang"], ["Nam", "Hung"], ["Trang", "Hung"], ["Trang", "Mai"],
  ];
  for (const [a, b] of pairs) {
    const contacts = (await req("/friend-request", { token: tokens[a] })).json;
    const alreadyFriends = contacts?.friends?.some((f) => String(f.userId) === String(ids[b]));
    if (!alreadyFriends) {
      const s = await req("/friend-request", {
        method: "POST", token: tokens[a], body: { receiverId: ids[b] },
      });
      const rid = s.status === 201
        ? Number(s.text)
        :
          (await req("/friend-request", { token: tokens[b] })).json?.incoming
            ?.find((r) => r.otherId === ids[a])?.requestId
          ?? 0;
      if (rid > 0) {
        const acc = await req(`/friend-request/${rid}/accept`, { method: "POST", token: tokens[b] });
        log(acc.status === 204, `seed bạn bè ${a} ↔ ${b}`, `req=${rid}`);
      } else {
        log(false, `seed bạn bè ${a} ↔ ${b}`, `HTTP ${s.status} — không tạo được requestId`);
      }
    } else {
      log(true, `seed bạn bè ${a} ↔ ${b}`, "đã là bạn từ trước — bỏ qua");
    }
  }


  const group = await req("/conversation", {
    method: "POST", token: tokens.Nam,
    body: { conversationType: "GROUP", memberId: [ids.Trang, ids.Hung] },
  });
  const groupId = group.json?.id;
  log(!!groupId && group.json?.conversationType === "GROUP", "tạo GROUP", `id=${groupId}`);
  log(group.status === 200 || group.status === 201, "POST /conversation GROUP", `HTTP ${group.status}`);


  let members = (await req(`/conversation-member?conversationId=${groupId}`, { token: tokens.Nam })).json;
  log(members?.find((m) => m.id === ids.Nam)?.role === "ADMIN", "creator là ADMIN");
  log(members?.find((m) => m.id === ids.Trang)?.role === "MEMBER", "member thêm vào là MEMBER");
  log(members?.length === 3, "3 thành viên sau tạo", `count=${members?.length}`);


  const addMai = await req(`/conversation-member?conversationId=${groupId}`, {
    method: "POST", token: tokens.Trang, body: { userId: ids.Mai },
  });
  log(addMai.status === 201, "Trang (MEMBER) thêm Mai được — isMember rule", `HTTP ${addMai.status}`);


  const blockedChange = await req(`/conversation-member/${ids.Hung}?conversationId=${groupId}`, {
    method: "PATCH", token: tokens.Trang, body: { role: "ADMIN" },
  });
  log(blockedChange.status === 403, "Trang (MEMBER) đổi role bị chặn 403", `HTTP ${blockedChange.status}`);


  const blockedKick = await req(`/conversation-member/${ids.Hung}?conversationId=${groupId}`, {
    method: "DELETE", token: tokens.Mai,
  });
  log(blockedKick.status === 403, "Mai (MEMBER) xóa thành viên bị chặn 403", `HTTP ${blockedKick.status}`);


  const promote = await req(`/conversation-member/${ids.Hung}?conversationId=${groupId}`, {
    method: "PATCH", token: tokens.Nam, body: { role: "ADMIN" },
  });
  log(promote.status === 200 && promote.json?.role === "ADMIN", "Nam (ADMIN) thăng Hung → ADMIN", `HTTP ${promote.status}`);
  const demote = await req(`/conversation-member/${ids.Hung}?conversationId=${groupId}`, {
    method: "PATCH", token: tokens.Nam, body: { role: "MEMBER" },
  });
  log(demote.status === 200 && demote.json?.role === "MEMBER", "gỡ quyền Hung → MEMBER", `HTTP ${demote.status}`);


  const lastAdmin = await req(`/conversation-member/${ids.Nam}?conversationId=${groupId}`, {
    method: "PATCH", token: tokens.Nam, body: { role: "MEMBER" },
  });
  log(lastAdmin.status >= 400, "last-admin guard: Nam không tự gỡ được quyền duy nhất", `HTTP ${lastAdmin.status}`);


  const kick = await req(`/conversation-member/${ids.Mai}?conversationId=${groupId}`, {
    method: "DELETE", token: tokens.Nam,
  });
  log(kick.status === 204, "Nam xóa Mai khỏi nhóm", `HTTP ${kick.status}`);
  members = (await req(`/conversation-member?conversationId=${groupId}`, { token: tokens.Nam })).json;
  log(members?.length === 3, "3 thành viên sau khi kick", `count=${members?.length}`);


  for (let i = 1; i <= 60; i++) {
    const r = await req(`/message?conversationId=${groupId}`, {
      method: "POST", token: tokens.Nam, body: { messageContent: `msg #${i}` },
    });
    if (r.status !== 201) { log(false, "gửi tin", `${i} → HTTP ${r.status}`); break; }
  }
  log(true, "gửi 60 tin REST");


  let page0 = (await req(`/message?conversationId=${groupId}&page=0&size=50`, { token: tokens.Nam })).json;
  const p0 = page0?.content ?? [];
  log(p0.length === 50, "page0 size=50 → 50 item", `count=${p0.length}`);
  log(p0[0]?.id > p0[49]?.id, "page0 sort DESC (mới nhất đầu)", `first=${p0[0]?.content} last=${p0[49]?.content}`);


  let page1 = (await req(`/message?conversationId=${groupId}&page=1&size=50`, { token: tokens.Nam })).json;
  const p1 = page1?.content ?? [];
  log(p1.length === 10, "page1 → 10 tin còn lại", `count=${p1.length}`);
  log(p1[0]?.id < p0[49]?.id, "page1 là tin cũ hơn page0");


  const maiLeave = await req(`/conversation-member/me?conversationId=${groupId}`, {
    method: "DELETE", token: tokens.Mai,
  });
  log(maiLeave.status >= 400, "Mai (đã bị kick) rời → chặn", `HTTP ${maiLeave.status}`);


  console.log(results.join("\n"));
  const fails = results.filter((r) => r.startsWith("FAIL"));
  process.exit(fails.length ? 1 : 0);
}

await main();
