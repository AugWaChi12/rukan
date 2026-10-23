#!/usr/bin/env bash
# ติดตั้ง Docker Engine (repo ทางการของ Docker) ใน WSL Ubuntu — ใช้แทน Docker Desktop
#
# รันจาก PowerShell / terminal ของ Windows ที่ root ของ repo (ไม่ต้องใส่รหัส sudo):
#   wsl -d Ubuntu-24.04 -u root -- bash scripts/wsl/install-docker.sh <ชื่อ user ใน Ubuntu>
# หรือรันใน Ubuntu เอง:
#   sudo bash scripts/wsl/install-docker.sh "$USER"
set -euo pipefail

TARGET_USER="${1:-${SUDO_USER:-}}"
if [ -z "$TARGET_USER" ] || [ "$TARGET_USER" = "root" ]; then
  echo "ใส่ชื่อ user ของ Ubuntu เป็น argument แรก เช่น: bash scripts/wsl/install-docker.sh myname" >&2
  exit 1
fi
if [ "$(id -u)" -ne 0 ]; then
  echo "ต้องรันเป็น root (wsl -u root ... หรือ sudo)" >&2
  exit 1
fi

echo "== Docker Engine =="
apt-get update -y
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "== ให้ $TARGET_USER ใช้ docker ได้โดยไม่ต้อง sudo =="
usermod -aG docker "$TARGET_USER"

echo "== เปิด docker อัตโนมัติ =="
if [ -d /run/systemd/system ]; then
  systemctl enable --now docker
else
  echo "systemd ไม่ได้เปิด: เพิ่ม [boot] systemd=true ใน /etc/wsl.conf แล้วรัน 'wsl --shutdown' ใน Windows" >&2
  exit 1
fi

docker run --rm hello-world | head -n 2
echo "เสร็จ ✅  ขั้นต่อไป: wsl -d Ubuntu-24.04 -- bash scripts/wsl/install-node.sh"
