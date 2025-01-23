package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
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

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ws.Close()

	// set connection timeout - 1 minute
	ws.SetReadDeadline(time.Now().Add(60 * time.Second))

	for {
		messageType, message, err := ws.ReadMessage()
		if err != nil {
			log.Println(err)
			break
		}
		log.Printf("Received %s", message)

		if err := ws.WriteMessage(messageType, message); err != nil {
			log.Println(err)
			break
		}

		// update connection deadline every message read
		ws.SetReadDeadline(time.Now().Add(60 * time.Second))
	}
}

func main() {
	http.HandleFunc("/ws", handleConnections)
	log.Println("http server started on :8000")
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
