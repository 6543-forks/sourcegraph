package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"io"
)

const (
	validKeyLength = 32
)

type EncryptionError struct {
	Message string
}

// Generate a valid key for AES-256 encryption
func GenerateRandomAESKey() ([]byte, error) {
	b := make([]byte, validKeyLength)
	_, err := rand.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (err *EncryptionError) Error() string {
	return err.Message
}

// Encrypter contains the encryption key used in encryption and decryption.
type Encrypter struct {
	EncryptionKey []byte
}

// Returns an enrypted string.
func (e *Encrypter) encrypt(key []byte, value string) (string, error) {
	// create a one time nonce of standard length, without repetitions

	byteVal := []byte(value)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	encrypted := make([]byte, aes.BlockSize+len(byteVal))
	nonce := encrypted[:aes.BlockSize]

	_, err = io.ReadFull(rand.Reader, nonce)
	if err != nil {
		return "", err
	}

	stream := cipher.NewCFBEncrypter(block, nonce)
	stream.XORKeyStream(encrypted[aes.BlockSize:], byteVal)
	return base64.StdEncoding.EncodeToString(encrypted), nil
}

// Encrypts the string, returning the encrypted value.
func (e *Encrypter) Encrypt(value string) (string, error) {
	return e.encrypt(e.EncryptionKey, value)
}

// EncryptIfPossible encrypts  the string if encryption is configured.
// Returns an error only when encryption is enabled, and encryption fails.
func (e *Encrypter) EncryptIfPossible(value string) (string, error) {
	if isEncrypted {
		return e.Encrypt(value)
	}
	return value, nil
}

// Decrypts the string, returning the decrypted value.
func (e *Encrypter) Decrypt(encodedValue string) (string, error) {
	encrypted, err := base64.StdEncoding.DecodeString(encodedValue)
	if err != nil {
		return "", nil
	}

	if len(encrypted) < aes.BlockSize {
		return "", &EncryptionError{Message: "Invalid block size."}
	}

	block, err := aes.NewCipher(e.EncryptionKey)
	if err != nil {
		return "", nil
	}

	nonce := encrypted[:aes.BlockSize]
	value := encrypted[aes.BlockSize:]
	stream := cipher.NewCFBDecrypter(block, nonce)
	stream.XORKeyStream(value, value)
	return string(value), nil
}

// DecryptIfPossible decrypts the string if encryption is configured.
// It returns an error only if encryption is enabled and it cannot decrypt the string
func (e *Encrypter) DecryptIfPossible(value string) (string, error) {
	if isEncrypted {
		return e.Decrypt(value)
	}
	return value, nil
}

// This function rotates the encryption used on an item by decryping and then recencrypting.
// Rotating keys updates the EncryptionKey within the Encrypter object
func (e *Encrypter) RotateKey(newKey []byte, encryptedValue string) (string, error) {
	decrypted, err := e.Decrypt(encryptedValue)
	if err != nil {
		return "", err
	}

	e.EncryptionKey = newKey
	return e.encrypt(newKey, decrypted)
}