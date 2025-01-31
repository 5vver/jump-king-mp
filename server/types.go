package main

import (
	"sync"

	"github.com/gorilla/websocket"
)

type Message[T any] struct {
	Type      string
	SessionId string
	ClientId  string
	Message   string
	Data      T
}

type Client struct {
	SessionId string
	ClientId  string
	Name      string
	Conn      *websocket.Conn
	Mutex     sync.Mutex
}

// type Session struct {
// 	SessionId string
// 	Clients   []Client
// }

type BroadcastParams struct {
	SessionId string
	Msg       []byte
}

type InitialConnectData = struct {
	SessionType string
	PlayerName  string
	Connections map[string]string
}
