#!/bin/bash

if [ ! -d "plots" ]; then
    echo "created plots/ directory"
    mkdir -p plots
else
    echo "plots directory already exists"
fi

wget https://kentsj.com/StressMap/plots/LTS.json -O plots/LTS.json
