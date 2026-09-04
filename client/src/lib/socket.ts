import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const rawApiUrl = import.meta.env.VITE_API_URL || "";
    let serverUrl = rawApiUrl.replace(/\/api\/?$/, "");
    if (!serverUrl) {
      serverUrl =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "http://localhost:3000"
          : window.location.origin;
    }

    socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token: localStorage.getItem("token") },
      autoConnect: true,
    });
  }
  return socket;
};
