package main

import (
	"github.com/joho/godotenv"
	"log"
	"net/http"
)

func init() {
	if err := godotenv.Load(); err != nil {
		log.Print("No .env file found")
	}
}

func main() {
	http.HandleFunc("/", handleConnections)
	log.Println("[INFO] http server started on :8000")
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("[ERROR] ListenAndServe: ", err)
	}
}
