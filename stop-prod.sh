#!/bin/bash

kill $(cat logs/app.pid)

rm -f logs/app.pid

echo "Stopped"
