package main

import (
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/ws", handleConnections)
	log.Println("[INFO] http server started on :8000")
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("[ERROR] ListenAndServe: ", err)
	}
}
