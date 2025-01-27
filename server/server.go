package main

import (
	"encoding/json"
	"log"
	"net/http"
	"slices"
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
var sessions = make([]string, 0)
var mutex = &sync.Mutex{}

func broadcastMessage(params BroadcastParams) {
	sessionId, message := params.SessionId, params.Msg

	mutex.Lock()
	defer mutex.Unlock()

	for clientId, client := range clients {
		conn := client.Conn
		if client.SessionId != sessionId {
			continue
		}
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Println("[ERROR] Write error:", err)
			conn.Close()
			delete(clients, clientId)
		}
	}
}

func handleNewClient(conn *websocket.Conn) (client *Client, err error) {
	// Read initial client msg - whenever its session create/connect
	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Printf("[ERROR] Initial read error: %v", err)
		return nil, err
	}

	initialMessage, err := GenericUnmarshal[Message](message)
	if err != nil {
		log.Println("[ERROR] JSON unmarshal error", err)
		return nil, err
	}

	sessionId := ""
	if len(initialMessage.SessionId) > 0 {
		sessionId = initialMessage.SessionId
	} else {
		// TODO: change sessionid gen method
		sessionId = uuid.NewString()[0:4]
	}
	if !slices.Contains(sessions, sessionId) {
		log.Printf("[INFO] New session: %s", sessionId)
		sessions = append(sessions, sessionId)
	}

	clientId := uuid.NewString()
	newClient := &Client{
		SessionId: sessionId,
		ClientId:  clientId,
		Conn:      conn,
	}

	clientIds := make([]string, 0, len(clients))
	for id, client := range clients {
		if client.SessionId != sessionId {
			continue
		}
		clientIds = append(clientIds, id)
	}

	msgBytes, _ := json.Marshal(Message{Type: "connect", SessionId: sessionId, ClientId: clientId, Data: map[string]interface{}{"connections": clientIds}})
	conn.WriteMessage(websocket.TextMessage, msgBytes)

	// add client to map
	mutex.Lock()
	clients[clientId] = newClient
	mutex.Unlock()

	log.Printf("[INFO] Client connected: %s", clientId)

	// broadcast new client connections to all clients
	broadcastMessage(BroadcastParams{Msg: msgBytes, SessionId: sessionId})

	return newClient, nil
}

func handleConnection(client *Client) {
	clientId, sessionId, conn := client.ClientId, client.SessionId, client.Conn
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

			msg, err := GenericUnmarshal[Message](message)
			if err != nil {
				log.Println("[ERROR] JSON unmarshal error", err)
				continue
			} else if msg.Type != "action" {
				log.Printf("[INFO] Received message: %v", msg)
			}

			// msgBytes, err := json.Marshal(msg)
			// if err != nil {
			// 	log.Println("[ERROR] JSON marshal error", err)
			// }
			broadcastMessage(BroadcastParams{Msg: message, SessionId: sessionId})
			// conn.WriteMessage(websocket.TextMessage, msgBytes)
		}
	}()

	// Ticker ping routine
	go func() {
		for {
			select {
			case <-ticker.C:
				// conn.SetWriteDeadline(time.Now().Add(writeWait))
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
	msgBytes, _ := json.Marshal(Message{Type: "disconnect", ClientId: clientId, SessionId: sessionId})
	broadcastMessage(BroadcastParams{Msg: msgBytes, SessionId: sessionId})
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}

	newClient, err := handleNewClient(ws)
	if err != nil {
		log.Printf("[ERROR] error handling new client: %v", err)
	}

	handleConnection(newClient)
}
