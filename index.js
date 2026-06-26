import express from "express"; // importamos la casita que sabe entregar archivos y mensajes
import { createServer } from "node:http"; // importamos la cocina que crea el servidor
import { fileURLToPath } from "node:url"; // importamos ayuda para encontrar la carpeta
import { dirname, join } from "node:path"; // importamos herramientas para unir rutas
import { Server } from "socket.io"; // importamos el guardián de los mensajes en tiempo real

const app = express(); // creamos la aplicación que enseña la página
const server = createServer(app); // creamos el servidor que escucha la puerta
const io = new Server(server, {
  cors: {
    // Aquí pones la URL de tu frontend en Vercel (sin la barra / al final)
    origin: "http://127.0.0.1:5500",
    methods: ["GET", "POST"], // Los métodos permitidos
  },
}); // creamos el lugar donde viven los mensajes en vivo

const __dirname = dirname(fileURLToPath(import.meta.url)); // esta es la carpeta donde está este archivo
const connectedUsers = new Map(); // aquí guardamos los amigos que están conectados

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html")); // cuando alguien pide la página, se la damos
});

function broadcastUsers() {
  const users = Array.from(connectedUsers.keys()); // tomamos todos los ids de los amigos
  io.emit("users", users); // les decimos a todos quiénes están conectados
}

io.on("connection", (socket) => {
  connectedUsers.set(socket.id, { id: socket.id }); // guardamos el id del nuevo amigo
  console.log(`usuario conectado: ${socket.id}`); // decimos en la consola quién llegó
  socket.emit("me", socket.id); // le decimos al nuevo amigo cuál es su id
  broadcastUsers(); // contamos a todos los amigos quiénes están conectados

  socket.on("request users", () => {
    socket.emit("users", Array.from(connectedUsers.keys())); // si alguien pide la lista, se la mandamos
  });

  socket.on("chat message", (msg, targetId) => {
    const fromId = socket.id; // este es el id de quien envía el mensaje
    console.log(`mensaje de ${fromId} a ${targetId}: ${msg}`); // mostramos el mensaje en la consola
    if (targetId && connectedUsers.has(targetId)) {
      socket.emit("chat message", msg, fromId, targetId); // mandamos mensaje al que escribió también
      socket.to(targetId).emit("chat message", msg, fromId, targetId); // mandamos mensaje al amigo seleccionado
    } else {
      socket.emit("chat error", "Selecciona un usuario válido para chatear."); // si no hay un amigo correcto, avisamos
    }
  });

  socket.on("disconnect", () => {
    connectedUsers.delete(socket.id); // eliminamos al amigo que se fue
    console.log(`usuario desconectado: ${socket.id}`); // decimos en la consola quién se fue
    broadcastUsers(); // decimos a todos la nueva lista de amigos conectados
  });
});

server.listen(3000, () => {
  console.log("servidor corriendo en http://localhost:3000"); // levantamos el servidor en el puerto 3000
});
