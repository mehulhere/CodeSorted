# Go net/http Documentation

This document contains information about the Go `net/http` package, which is used for building HTTP servers and clients.

## API Reference

### `net/http` Package

*   **`pkg net/http, const TrailerPrefix ideal-string`**: `TrailerPrefix` is the prefix for trailer keys.
*   **`pkg net/http, method (*Server) Close() error`**: `Close` immediately closes all active net.Listeners and any connections in StateNew, StateActive, or StateIdle.
*   **`pkg net/http, method (*Server) Shutdown(context.Context) error`**: `Shutdown` gracefully shuts down the server without interrupting any active connections.
*   **`pkg net/http, type Pusher interface { Push }`**: `Pusher` is an interface implemented by ResponseWriters that support HTTP/2 server push.
*   **`pkg net/http, type PushOptions struct`**: `PushOptions` specifies options for server push.
*   **`pkg net/http, type Request struct, GetBody func() (io.ReadCloser, error)`**: `GetBody` defines an optional function that returns a new copy of the request body.
*   **`pkg net/http, type Server struct, IdleTimeout time.Duration`**: `IdleTimeout` is the maximum amount of time to wait for the next request when keep-alives are enabled.
*   **`pkg net/http, type Server struct, ReadHeaderTimeout time.Duration`**: `ReadHeaderTimeout` is the amount of time allowed to read request headers.
*   **`pkg net/http, var ErrAbortHandler error`**: `ErrAbortHandler` is a sentinel error value returned by handlers to abort the HTTP request.
*   **`pkg net/http, var ErrServerClosed error`**: `ErrServerClosed` is returned by the Server's Serve, ServeTLS, and ListenAndServe methods after a call to Shutdown or Close.
*   **`pkg net/http, var NoBody noBody`**: `NoBody` is an io.ReadCloser with no bytes. It is used when a request has no body.
*   **`pkg net/http, func FileServerFS(fs.FS) Handler`**: `FileServerFS` returns a handler that serves HTTP requests with the contents of the file system `fs`.
*   **`pkg net/http, func NewFileTransportFS(fs.FS) RoundTripper`**: `NewFileTransportFS` returns a `RoundTripper` that serves files from the given `fs.FS`.
*   **`pkg net/http, func ServeFileFS(ResponseWriter, *Request, fs.FS, string)`**: `ServeFileFS` replies to the request with the contents of the named file within the file system `fs`.
*   **`pkg net/http, method (*Request) PathValue(string) string`**: `PathValue` returns the value for the named path wildcard in the registered pattern.
*   **`pkg net/http, method (*Request) SetPathValue(string, string)`**: `SetPathValue` sets the value for the named path wildcard in the registered pattern.
*   **`pkg net/http, method (*Request) BasicAuth() (string, string, bool)`**: `BasicAuth` returns the username and password provided in the request's Authorization header.
*   **`pkg net/http, type MaxBytesError struct`**: `MaxBytesError` is the error type returned when a request body is larger than the configured limit.
*   **`pkg net/http, func ParseCookie(string) ([]*Cookie, error)`**: `ParseCookie` parses a cookie header string and returns a slice of `Cookie` structs.
*   **`pkg net/http, func ParseSetCookie(string) (*Cookie, error)`**: `ParseSetCookie` parses a Set-Cookie header string and returns a `Cookie` struct.
*   **`pkg net/http, method (*Request) CookiesNamed(string) []*Cookie`**: `CookiesNamed` returns all cookies with the given name.

### `net/url` Package

*   **`pkg net/url, func PathEscape(string) string`**: `PathEscape` escapes the string so it can be safely placed in a URL path segment.
*   **`pkg net/url, func PathUnescape(string) (string, error)`**: `PathUnescape` does the inverse transformation of `PathEscape`.
*   **`pkg net/url, method (*URL) Hostname() string`**: `Hostname` returns the host, without the port.
*   **`pkg net/url, method (*URL) Port() string`**: `Port` returns the port part of the host.
*   **`pkg net/url, func JoinPath(string, ...string) (string, error)`**: `JoinPath` joins a host and a list of path elements.

### `net/http/httputil` Package

*   **`pkg net/http/httputil, type ReverseProxy struct, ModifyResponse func(*http.Response) error`**: `ModifyResponse` is an optional function that modifies the response from the backend.
*   **`pkg net/http/httputil, type ReverseProxy struct, ErrorHandler func(http.ResponseWriter, *http.Request, error)`**: `ErrorHandler` is an optional function that handles errors from the backend.
*   **`pkg net/http/httputil, type ReverseProxy struct, ErrorLog *log.Logger`**: `ErrorLog` is an optional logger for errors that occur when attempting to proxy the request.

### `net/http/httptest` Package

*   **`pkg net/http/httptest, method (*Server) Certificate() *x509.Certificate`**: `Certificate` returns the server's certificate.
*   **`pkg net/http/httptest, method (*Server) Client() *http.Client`**: `Client` returns a client that can be used to make requests to the server. 