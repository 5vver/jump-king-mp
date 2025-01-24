package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

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

var upgrader = websocket.Upgrader{
	ReadBufferSize:    1024,
	WriteBufferSize:   1024,
	EnableCompression: false,
	CheckOrigin: func(r *http.Request) bool {
		// dev purposes CHANGE THAT
		return true
	},
}

var clients = make(map[*websocket.Conn]bool)
var mutex = &sync.Mutex{}

func handleConnection(conn *websocket.Conn) {
	defer conn.Close()

	msgChan := make(chan []byte)
	id := ""

	// pong handler
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(appData string) error {
		log.Printf("[INFO] %s: Pong received", id)
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
			} else {
				log.Printf("[INFO] Received message: %v", msg)
			}

			if len(msg.Id) > 0 {
				id = msg.Id
				log.Printf("[INFO] connected: %s", id)
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
			log.Println(err)
			break
		}
		msgChan <- message
	}

	// Remove client from map on disconnect
	mutex.Lock()
	delete(clients, conn)
	log.Printf("[INFO] Disconnected: %s", id)
}

func broadcastMessage(message []byte) {
	mutex.Lock()
	defer mutex.Unlock()

	for client := range clients {
		if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Println("[ERROR] Write error:", err)
			client.Close()
			delete(clients, client)
		}
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}

	// add client to map
	mutex.Lock()
	clients[ws] = true
	mutex.Unlock()

	handleConnection(ws)
}

func main() {
	http.HandleFunc("/ws", handleConnections)
	log.Println("[INFO] http server started on :8000")
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("[ERROR] ListenAndServe: ", err)
	}
}
