#!/usr/bin/env bash
# ติดตั้ง Node.js (ตาม .nvmrc) ด้วย nvm ใน WSL Ubuntu — ใช้รัน Supabase CLI เวอร์ชัน Linux
#
# รันเป็น user ปกติ (ไม่ต้อง sudo) จาก root ของ repo:
#   wsl -d Ubuntu-24.04 -- bash scripts/wsl/install-node.sh

# ไม่ใช้ set -e: nvm.sh คืนค่า non-zero ตอน source ได้แม้จะสำเร็จ
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_VERSION="$(tr -d '[:space:]' < "$REPO_ROOT/.nvmrc")"

export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install "$NODE_VERSION"
nvm alias default "$NODE_VERSION"
echo "เสร็จ ✅  node $(node -v) — ใช้งาน: pnpm db:wsl start"
