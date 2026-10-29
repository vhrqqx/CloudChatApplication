import { Client } from "@stomp/stompjs";

const base = "http://localhost:8080/api/v1";

async function login() {
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail: "trang@test.vn", password: "matkhau67890" }),
  });
  const json = await res.json();
  return json.accessToken;
}

const token = await login();
console.log("login OK (Trang)");

const client = new Client({
  brokerURL: "ws://localhost:5173/ws",
  connectHeaders: { Authorization: `Bearer ${token}` },
  reconnectDelay: 0,
  debug: (m) => console.log("STOMP:", m),
  onConnect: () => {
    console.log(">>> CONNECTED");
    client.subscribe("/user/queue/errors", (m) => {
      console.log(">>> USER-ERROR FRAME:", m.body);
      process.exit(2);
    });
    setTimeout(() => {
      console.log(">>> SEND /app/chat/1 (Trang là member)");
      client.publish({
        destination: "/app/chat/1",
        body: JSON.stringify({ messageContent: "trang-send" }),
      });
    }, 200);
  },
  onStompError: (frame) => {
    console.log(">>> STOMP ERROR headers:", JSON.stringify(frame.headers));
    console.log(">>> STOMP ERROR body:", frame.body);
    process.exit(3);
  },
  onWebSocketClose: (e) => console.log(">>> WS CLOSE", e?.code, e?.reason || ""),
});

client.activate();

setTimeout(() => {
  console.log(">>> TIMEOUT 8s không nhận được gì");
  process.exit(4);
}, 8000);
