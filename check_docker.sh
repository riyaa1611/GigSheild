#!/bin/bash
set -e
{
  echo "=== $(date) ==="
  echo "=== docker ps ==="
  docker ps -a --filter "name=gigshield" --format "{{.Names}} | {{.Status}} | {{.Ports}}"
  echo "=== docker system df ==="
  docker system df
  echo "=== DONE ==="
} > d:/GigShield/docker_status.txt 2>&1
