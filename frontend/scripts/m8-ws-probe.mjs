




import { Client } from "@stomp/stompjs";

const base = "http://localhost:8080/api/v1";
const USERS = [
  { userEmail: "nam@test.vn", password: "matkhau12345", username: "Nam" },
  { userEmail: "trang@test.vn", password: "matkhau67890", username: "Trang" },
  { userEmail: "hung@test.vn", password: "matkhau24680", username: "Hung" },
  { userEmail: "mai@test.vn", password: "matkhau13579", username: "Mai" },
];
for (const u of USERS) {
  await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(u),
  });
}

async function login(email, password) {
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail: email, password }),
  });
  const json = await res.json();
  return { token: json.accessToken, id: json.user?.id };
}

const me = await login("trang@test.vn", "matkhau67890");
const nam = await login("nam@test.vn", "matkhau12345");
console.log("login OK (Trang id=" + me.id + ", Nam id=" + nam.id + ")");

const client = new Client({
  brokerURL: "ws://localhost:8080/ws",
  connectHeaders: { Authorization: `Bearer ${me.token}` },
  reconnectDelay: 0,
  debug: (m) => console.log("STOMP:", m.trim().split("\n")[0]),
  onConnect: () => {
    console.log(">>> CONNECTED " + new Date().toISOString());
    client.subscribe("/topic/contacts", (m) => {
      console.log(">>> CONTACTS FRAME:", m.body);
      process.exit(0);
    });
    setTimeout(async () => {
      console.log(">>> REST: Nam gửi lời mời cho Trang");
      const r = await fetch(`${base}/friend-request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${nam.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: me.id }),
      });
      console.log(">>> REST status:", r.status);
    }, 2000);
  },
  onStompError: (f) => {
    console.log(">>> STOMP ERROR:", f.headers, f.body);
    process.exit(3);
  },
  onWebSocketClose: (e) => {
    console.log(">>> WS CLOSE code=" + e?.code + " reason=" + (e?.reason || "(trống)"));
    process.exit(e?.code === 1000 ? 4 : 5);
  },
});

client.activate();
setTimeout(() => {
  console.log(">>> TIMEOUT 30s — không nhận được gì (kết vẫn sống)");
  process.exit(6);
}, 30000);
