#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${1:-asterisk}"
ASTERISK_IMAGE="${2:-andrius/asterisk:latest}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASTERISK_DIR="${SCRIPT_DIR}/asterisk"
AGI_DIR="/var/lib/asterisk/agi-bin"
SOUNDS_DIR="/var/lib/asterisk/sounds/voice-agent"
DOCKER_EXEC=(docker exec "${CONTAINER_NAME}")
DOCKER_EXEC_ROOT=(docker exec -u 0 "${CONTAINER_NAME}")

# ---------------------------------------------------------------------------
# Pull & start Asterisk container if not already running
# ---------------------------------------------------------------------------
if ! docker ps --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  echo "Container '${CONTAINER_NAME}' is not running. Pulling image '${ASTERISK_IMAGE}'..."
  docker pull "${ASTERISK_IMAGE}"

  echo "Starting container '${CONTAINER_NAME}'..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    --network host \
    --restart unless-stopped \
    "${ASTERISK_IMAGE}"

  # Give Asterisk a moment to initialize
  echo "Waiting for Asterisk to initialize..."
  sleep 5

  if ! docker ps --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
    echo "ERROR: Container '${CONTAINER_NAME}' failed to start. Check 'docker logs ${CONTAINER_NAME}'."
    exit 1
  fi
  echo "Container '${CONTAINER_NAME}' is running."
else
  echo "Container '${CONTAINER_NAME}' is already running. Skipping pull/start."
fi

# ---------------------------------------------------------------------------
# Prepare directories
# ---------------------------------------------------------------------------
echo "Preparing directories inside container ${CONTAINER_NAME}..."
"${DOCKER_EXEC_ROOT[@]}" sh -lc "
  mkdir -p /etc/asterisk ${AGI_DIR} ${SOUNDS_DIR} /tmp/voice-agent
  chmod 777 /tmp/voice-agent
  chown asterisk:asterisk /tmp/voice-agent
"

# ---------------------------------------------------------------------------
# Copy Asterisk config files
# ---------------------------------------------------------------------------
echo "Copying Asterisk config files..."
docker cp "${ASTERISK_DIR}/extensions.conf" "${CONTAINER_NAME}:/etc/asterisk/extensions.conf"
docker cp "${ASTERISK_DIR}/sip.conf"        "${CONTAINER_NAME}:/etc/asterisk/sip.conf"
docker cp "${ASTERISK_DIR}/pjsip.conf"      "${CONTAINER_NAME}:/etc/asterisk/pjsip.conf"
docker cp "${ASTERISK_DIR}/modules.conf"    "${CONTAINER_NAME}:/etc/asterisk/modules.conf"

# ---------------------------------------------------------------------------
# Copy AGI Python scripts
# ---------------------------------------------------------------------------
echo "Copying AGI Python scripts..."
for file in agent.py gemini.py rag.py stt.py tts.py .env; do
  docker cp "${SCRIPT_DIR}/${file}" "${CONTAINER_NAME}:${AGI_DIR}/${file}"
done

# ---------------------------------------------------------------------------
# Copy Google credentials (key.json / auth.json)
# ---------------------------------------------------------------------------
KEY_SOURCE=""
for candidate in \
  "${SCRIPT_DIR}/key.json" \
  "${SCRIPT_DIR}/auth.json" \
  "${SCRIPT_DIR}/../key.json" \
  "${SCRIPT_DIR}/../auth.json"
do
  if [[ -f "${candidate}" ]]; then
    KEY_SOURCE="${candidate}"
    break
  fi
done

if [[ -n "${KEY_SOURCE}" ]]; then
  echo "Copying Google credentials from ${KEY_SOURCE}..."
  docker cp "${KEY_SOURCE}" "${CONTAINER_NAME}:${AGI_DIR}/key.json"
else
  echo "WARNING: No key.json/auth.json found. Copy your credential file manually to ${AGI_DIR}/key.json"
fi

# ---------------------------------------------------------------------------
# Install runtime dependencies inside container
# ---------------------------------------------------------------------------
echo "Installing runtime dependencies inside container..."
"${DOCKER_EXEC_ROOT[@]}" sh -lc '
set -e
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -q
elif command -v apk >/dev/null 2>&1; then
  :
else
  echo "Unsupported package manager inside container."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y python3
  elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache python3
  fi
fi

if ! python3 -m pip --version >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y python3-pip
  elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache py3-pip
  fi
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg
  elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache ffmpeg
  fi
fi

python3 -m pip install --no-cache-dir --break-system-packages \
  requests \
  google-auth \
  google-cloud-speech \
  python-dotenv \
  audioop-lts

chmod +x /var/lib/asterisk/agi-bin/agent.py
'

# ---------------------------------------------------------------------------
# Fix permissions
# ---------------------------------------------------------------------------
echo "Fixing permissions on sounds and tmp dirs..."
"${DOCKER_EXEC_ROOT[@]}" sh -lc "
  chown -R asterisk:asterisk /var/lib/asterisk/sounds/voice-agent
  chmod -R 755 /var/lib/asterisk/sounds/voice-agent
  chown asterisk:asterisk /tmp/voice-agent
  chmod 777 /tmp/voice-agent
"

# ---------------------------------------------------------------------------
# Reload Asterisk config
# ---------------------------------------------------------------------------
echo "Reloading Asterisk configuration..."
"${DOCKER_EXEC_ROOT[@]}" sh -lc "asterisk -rx 'core reload'"
"${DOCKER_EXEC_ROOT[@]}" sh -lc "asterisk -rx 'module reload res_pjsip.so'"

echo ""
echo "Setup complete."
echo "Linphone account : agent / 1234"
echo "Domain           : YOUR_LAPTOP_IP"