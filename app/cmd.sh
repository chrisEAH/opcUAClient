#!/bin/bash

set -e


if [ "$ENV" = "TEST" ]
    then
    echo "running Test"
    exec npm start
else
    echo "ruuning Production"
    exec npm start
fi