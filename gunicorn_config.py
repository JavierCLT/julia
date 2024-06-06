# gunicorn_config.py
import os
import signal
import gunicorn.app.base

def on_starting(server):
    server.log.info("Starting Gunicorn server...")

def pre_fork(server, worker):
    signal.signal(signal.SIGPIPE, signal.SIG_IGN)

def when_ready(server):
    server.log.info("Gunicorn server is ready.")

def worker_abort(worker):
    worker.log.info("Worker aborted.")

bind = "0.0.0.0:8080"
workers = 3
