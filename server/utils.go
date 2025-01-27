package main

import "encoding/json"

func GenericUnmarshal[T any](data []byte) (*T, error) {
	var result T
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}

	return &result, nil
}
