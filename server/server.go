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
		var origin = r.Header.Get("origin")
		if origin == getEnv("ORIGIN_URL", "") {
			return true
		}
		return false
	},
}

var clients = make(map[string]*Client)
var sessions = make([]string, 0)
var broadcastMutex = &sync.Mutex{}

func broadcastMessage(params BroadcastParams) {
	sessionId, message := params.SessionId, params.Msg

	broadcastMutex.Lock()
	defer broadcastMutex.Unlock()

	for clientId, client := range clients {
		conn := client.Conn
		defer client.Mutex.Unlock()
		client.Mutex.Lock()
		if client.SessionId != sessionId {
			continue
		}
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Println("[ERROR] Write error:", err)
			conn.Close()
			delete(clients, clientId)
			return
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

	initialMessage, err := GenericUnmarshal[Message[InitialConnectData]](message)
	if err != nil {
		log.Println("[ERROR] JSON unmarshal error", err)
		return nil, err
	}

	// Handle session
	sessionId := initialMessage.SessionId
	if !slices.Contains(sessions, sessionId) {
		log.Printf("[INFO] New session: %s", sessionId)
		sessions = append(sessions, sessionId)
	}

	// Handle client
	clientId := uuid.NewString()
	newClient := &Client{
		SessionId: sessionId,
		ClientId:  clientId,
		Name:      initialMessage.Data.PlayerName,
		Conn:      conn,
		Mutex:     sync.Mutex{},
	}

	// [clientId]: clientName
	connections := map[string]string{}
	for id, client := range clients {
		if client.SessionId != sessionId {
			continue
		}
		connections[id] = client.Name
	}

	initialMessage.ClientId, initialMessage.SessionId = clientId, sessionId
	initialMessage.Data = InitialConnectData{
		Connections: connections,
		SessionType: initialMessage.Data.SessionType,
		PlayerName:  initialMessage.Data.PlayerName,
	}

	msgBytes, _ := json.Marshal(initialMessage)
	conn.WriteMessage(websocket.TextMessage, msgBytes)

	// add client to map
	broadcastMutex.Lock()
	clients[clientId] = newClient
	broadcastMutex.Unlock()

	log.Printf("[INFO] Client connected: %s to session: %s", clientId, sessionId)

	// broadcast new client connections to all clients
	broadcastMessage(BroadcastParams{Msg: msgBytes, SessionId: sessionId})

	return newClient, nil
}

func handleConnection(client *Client) {
	clientId, sessionId, conn := client.ClientId, client.SessionId, client.Conn

	msgChan := make(chan []byte)

	// pong handler
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(appData string) error {
		log.Printf("[INFO] %s: Pong received", clientId)
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	// Received messages handle routine
	go func() {
		for {
			message, ok := <-msgChan
			if !ok {
				return
			}

			msg, err := GenericUnmarshal[Message[interface{}]](message)
			if err != nil {
				log.Println("[ERROR] JSON unmarshal error", err)
				continue
			} else if msg.Type != "action" {
				log.Printf("[INFO] Received message: %v", msg)
			}

			broadcastMessage(BroadcastParams{Msg: message, SessionId: sessionId})
		}
	}()

	tickerDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(pingPeriod)
		defer ticker.Stop()

		for {
			select {
			case <-tickerDone:
				return
			case <-ticker.C:
				// conn.SetWriteDeadline(time.Now().Add(writeWait))
				client.Mutex.Lock()
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					log.Printf("[ERROR] Ping err: %e", err)
					client.Mutex.Unlock()
					return
				}
				client.Mutex.Unlock()
			}
		}
	}()

	// Read connection messages
	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			close(msgChan)
			log.Printf("[ERROR]: %v", err)
			break
		}
		msgChan <- message
	}

	tickerDone <- struct{}{}
	// Remove client from map on disconnect
	broadcastMutex.Lock()
	delete(clients, clientId)
	log.Printf("[INFO] Disconnected: %s", clientId)
	broadcastMutex.Unlock()

	// Broadcast disconnected session
	msgBytes, err := json.Marshal(Message[interface{}]{Type: "disconnect", ClientId: clientId, SessionId: sessionId})
	if err != nil {
		log.Println("[ERROR] JSON marshal error", err)
		return
	}
	broadcastMessage(BroadcastParams{Msg: msgBytes, SessionId: sessionId})

	defer func() {
		conn.Close()
		log.Printf("[INFO] Connection closed: %s", clientId)
	}()
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ERROR] error upgrading connection: %v", err)
	}

	newClient, err := handleNewClient(ws)
	if err != nil {
		log.Printf("[ERROR] error handling new client: %v", err)
		ws.Close()
	}

	go handleConnection(newClient)
}
