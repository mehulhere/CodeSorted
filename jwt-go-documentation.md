# Go JWT (golang-jwt/jwt) Documentation

This document contains information about the `golang-jwt/jwt` package, focusing on creating and validating JWT tokens.

## Creating Tokens

To create a token, you need to create a `Token` object, specifying the signing method and the claims.

**Example: Creating a token with custom claims**
```go
import "github.com/golang-jwt/jwt/v5"

// Create the Claims
claims := &jwt.RegisteredClaims{
    ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 72)),
    Issuer:    "test",
}

token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
ss, err := token.SignedString([]byte("AllYourBase"))
```

## Parsing and Validating Tokens

To parse a token, you use the `jwt.Parse` function. You need to provide a `Keyfunc` to supply the key for verification.

**Example: Parsing and validating a token**
```go
tokenString := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJuYmYiOjE0NDQ0Nzg0MDB9.u1riaD1rW97opCoAuRCTy4w58Br-Zk-bh7vLiRIsrpU"

token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
    // Don't forget to validate the alg is what you expect:
    if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
        return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
    }

    // hmacSampleSecret is a []byte containing your secret, e.g. []byte("my_secret_key")
    return hmacSampleSecret, nil
})

if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
    fmt.Println(claims["foo"], claims["nbf"])
} else {
    fmt.Println(err)
}
```

## Custom Claims

You can create your own custom claims struct by embedding `jwt.RegisteredClaims`.

```go
type MyCustomClaims struct {
    Foo string `json:"foo"`
    jwt.RegisteredClaims
}
```
You can also add custom validation logic for your claims by implementing the `ClaimsValidator` interface.

```go
func (m MyCustomClaims) Validate() error {
    if m.Foo != "bar" {
        return errors.New("must be foobar")
    }
    return nil
}
``` 