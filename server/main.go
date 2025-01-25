package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

type Message struct {
	Type    string
	Id      string
	Message string
	Data    interface{}
}

type Client struct {
	ID   string
	Conn *websocket.Conn
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:    1024,
	WriteBufferSize:   1024,
	EnableCompression: false,
	CheckOrigin: func(r *http.Request) bool {
		// dev purposes CHANGE THAT
		return true
	},
}

var clients = make(map[string]*Client)
var mutex = &sync.Mutex{}

func handleConnection(client *Client) {
	clientId, conn := client.ID, client.Conn
	defer conn.Close()

	msgChan := make(chan []byte)

	// pong handler
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(appData string) error {
		log.Printf("[INFO] %s: Pong received", clientId)
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	// Received messages handle routine
	go func() {
		for {
			message, ok := <-msgChan
			if !ok {
				return
			}

			var msg Message
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Println("[ERROR] JSON unmarshal error", err)
				continue
			} else if msg.Type != "action" {
				log.Printf("[INFO] Received message: %v", msg)
			}

			msgBytes, _ := json.Marshal(msg)
			broadcastMessage(msgBytes)
			// conn.WriteMessage(websocket.TextMessage, msgBytes)
		}
	}()

	// Ticker ping routine
	go func() {
		for {
			select {
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(writeWait))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					log.Println("[ERROR] Error sending ping:", err)
					return
				}
			}
		}
	}()

	// Read connection messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			close(msgChan)
			log.Printf("[ERROR]: %v", err)
			break
		}
		msgChan <- message
	}

	// Remove client from map on disconnect
	mutex.Lock()
	delete(clients, clientId)
	log.Printf("[INFO] Disconnected: %s", clientId)
	mutex.Unlock()
	// Broadcast disconnected session
	msgBytes, _ := json.Marshal(Message{Type: "disconnect", Id: clientId})
	broadcastMessage(msgBytes)
}

func broadcastMessage(message []byte) {
	mutex.Lock()
	defer mutex.Unlock()

	for clientId, client := range clients {
		conn := client.Conn
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Println("[ERROR] Write error:", err)
			conn.Close()
			delete(clients, clientId)
		}
	}
}

func handleNewClient(client *Client) {
	mutex.Lock()
	defer mutex.Unlock()

	clientIds := make([]string, 0, len(clients))
	for id := range clients {
		clientIds = append(clientIds, id)
	}

	msgBytes, _ := json.Marshal(Message{Type: "connect", Id: client.ID, Data: map[string]interface{}{"connections": clientIds}})
	client.Conn.WriteMessage(websocket.TextMessage, msgBytes)
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}

	clientId := uuid.NewString()
	newClient := &Client{
		ID:   clientId,
		Conn: ws,
	}

	// add client to map
	mutex.Lock()
	clients[clientId] = newClient
	mutex.Unlock()

	log.Printf("[INFO] Client connected: %s", clientId)

	// we broadcast new connection to all users. This needs to be fixed.
	// We first need to send connection msg to this connection, only after - broadcast

	// send to new client connections all connected clients
	handleNewClient(newClient)
	msgBytes, _ := json.Marshal(Message{Type: "connect", Id: clientId})
	// broadcast new client connections to all clients
	broadcastMessage(msgBytes)

	handleConnection(newClient)
}

func main() {
	http.HandleFunc("/ws", handleConnections)
	log.Println("[INFO] http server started on :8000")
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("[ERROR] ListenAndServe: ", err)
	}
}
