package main

import "github.com/gorilla/websocket"

type Message struct {
	Type      string
	SessionId string
	ClientId  string
	Message   string
	Data      interface{}
}

type Client struct {
	SessionId string
	ClientId  string
	Conn      *websocket.Conn
}

// type Session struct {
// 	SessionId string
// 	Clients   []Client
// }

type BroadcastParams struct {
	SessionId string
	Msg       []byte
}
