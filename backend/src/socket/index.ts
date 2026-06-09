import { Server } from "socket.io";

let io: Server;

const userSocketMap = new Map<number, string>(); 

export const initSocket = (httpServer: any) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // client sends employeeId after login
    socket.on("register", (employeeId: number) => {
      userSocketMap.set(employeeId, socket.id);
    });

    socket.on("disconnect", () => {
      for (const [userId, sockId] of userSocketMap.entries()) {
        if (sockId === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
    });
  });

  return io;
};

export const getIO = () => io;

export const getUserSocket = (employeeId: number) => {
  return userSocketMap.get(employeeId);
};