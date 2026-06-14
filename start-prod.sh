#!/bin/bash

mkdir -p logs

nohup java -Dspring.profiles.active=prod -jar build/libs/url-shortener-0.0.1-SNAPSHOT.jar > logs/app.log 2>&1 &

echo $! > logs/app.pid

echo "Started PID $(cat logs/app.pid)"
