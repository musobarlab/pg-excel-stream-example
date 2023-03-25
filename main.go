package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"database/sql"

	_ "github.com/lib/pq"
)

const (
	// DefaultPort default port for http server
	DefaultPort = 9113
)

var db *sql.DB

// This function will make a connection to the database only once.
func init() {
	var err error

	connStr := "postgres://codebaseuser:12345678@localhost:5432/mydb?sslmode=disable"
	db, err = sql.Open("postgres", connStr)

	if err != nil {
		panic(err)
	}

	if err = db.Ping(); err != nil {
		panic(err)
	}
	// this will be printed in the terminal, confirming the connection to the database
	fmt.Println("The database is connected")
}

func waitNotify(kill chan os.Signal, done chan bool, db *sql.DB) {
	select {
	case <-kill:
		fmt.Println("signal kill....")
		err := db.Close()
		if err != nil {
			fmt.Println(err)
		}

		done <- true
	}
}

// https://rafallorenz.com/go/go-http-stream-download/
func main() {
	// f, err := os.Create("users.csv")
	// if err != nil {
	// 	fmt.Println(err)
	// 	os.Exit(1)
	// }

	// defer func() { f.Close() }()

	// err = generateDummyCSV(f, 1)
	// if err != nil {
	// 	fmt.Println(err)
	// 	os.Exit(1)
	// }

	http.HandleFunc("/", loggerMiddleware(indexHandler()))
	http.HandleFunc("/download-csv", loggerMiddleware(downloadCSVHandler()))

	kill := make(chan os.Signal, 1)
	done := make(chan bool, 1)
	// notify when user interrupt the process
	signal.Notify(kill, syscall.SIGINT, syscall.SIGTERM)

	go waitNotify(kill, done, db)

	go func() {
		fmt.Printf("webapp running on port :%d\n", DefaultPort)
		err := http.ListenAndServe(fmt.Sprintf(":%d", DefaultPort), nil)
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
	}()

	<-done
}

func downloadCSVHandler() http.HandlerFunc {
	return func(res http.ResponseWriter, req *http.Request) {

		res.Header().Set("Content-Disposition", "attachment; filename=db_dump.csv")
		res.Header().Set("Content-Type", "text/csv")
		res.Header().Set("Last-Modified", time.Now().UTC().Format(http.TimeFormat))

		ctx := req.Context()

		done := make(chan error)

		go func() {
			err := generateCSVFromDB(ctx, res, db)
			if err != nil {
				done <- err
			}

			done <- nil
		}()

		err := <-done
		if err != nil {
			fmt.Println(err)
			res.WriteHeader(400)
			return
		}

	}
}

func downloadHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp, err := http.Get("https://4kwallpapers.com/images/wallpapers/the-super-mario-3840x5577-10880.jpg")
		if err != nil {
			http.Error(w, "could not write response", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", "file.jpeg"))
		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Last-Modified", time.Now().UTC().Format(http.TimeFormat))

		_, err = io.Copy(w, resp.Body)
		if err != nil {
			http.Error(w, "could not read body", http.StatusInternalServerError)
			return
		}
	}
}

func indexHandler() http.HandlerFunc {
	return func(res http.ResponseWriter, req *http.Request) {
		if err := db.Ping(); err != nil {
			fmt.Println(err)
		}
		jsonResponse(res, 200, []byte(`{"success": true, "message": "server up and running"}`))
	}
}

// HTTP utility
func jsonResponse(res http.ResponseWriter, httpCode int, payload []byte) {
	res.Header().Add("Content-Type", "application/json")
	res.WriteHeader(httpCode)
	res.Write(payload)
}

func loggerMiddleware(next http.Handler) http.HandlerFunc {
	return func(res http.ResponseWriter, req *http.Request) {
		start := time.Now()
		fmt.Printf("path: %s | method: %s | remote_address: %s | user_agent: %s | duration: %v\n",
			req.URL.EscapedPath(), req.Method, req.RemoteAddr, req.UserAgent(), time.Since(start))
		next.ServeHTTP(res, req)
	}
}

func generateDummyCSV(ctx context.Context, out io.Writer, delaySeconds int) error {
	w := csv.NewWriter(out)

	for i := 0; i < 50000000; i++ {
		record := []string{"5", "alox", "red"}
		select {

		// handle cancel download from user
		case <-ctx.Done():
			fmt.Println("request cancelled")
			return ctx.Err()

		// add default case, to avoid block from this select block
		default:
		}

		// time.Sleep(time.Duration(delaySeconds) * time.Second)
		if err := w.Write(record); err != nil {
			return err
		}

		// Flush writes any buffered data to the underlying io.Writer
		w.Flush()
		if err := w.Error(); err != nil {
			fmt.Println(err)
		}
	}

	return nil
}

func generateCSVFromDB(ctx context.Context, out io.Writer, db *sql.DB) error {
	w := csv.NewWriter(out)

	rows, err := db.Query(`SELECT * FROM public."accounts" LIMIT 1000000`)
	if err != nil {
		return err
	}

	defer func() { rows.Close() }()

	for rows.Next() {

		var id int
		var name string
		var email string
		var createdAt time.Time

		err = rows.Scan(&id, &name, &email, &createdAt)
		if err != nil {
			return err
		}

		record := []string{strconv.Itoa(id), name, email, createdAt.String()}
		select {

		// handle cancel download from user
		case <-ctx.Done():
			fmt.Println("request cancelled")
			return ctx.Err()

		// add default case, to avoid block from this select block
		default:
		}

		// time.Sleep(time.Duration(delaySeconds) * time.Second)
		if err := w.Write(record); err != nil {
			return err
		}

		// Flush writes any buffered data to the underlying io.Writer
		w.Flush()
		if err := w.Error(); err != nil {
			return err
		}
	}

	return nil
}
