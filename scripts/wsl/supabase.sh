#!/usr/bin/env bash
# เรียก Supabase CLI (เวอร์ชัน Linux) ใน WSL สำหรับ repo นี้ — ใช้เมื่อ Docker อยู่ใน WSL ไม่ใช่ Docker Desktop
#
# จาก Windows (root ของ repo):   pnpm db:wsl start | stop | status | db reset | test db
# หรือ:                          wsl -d Ubuntu-24.04 -- bash scripts/wsl/supabase.sh <คำสั่ง supabase>
#
# ทำไมไม่ใช้ `pnpm db:*`: Supabase CLI ใน node_modules เป็น binary ของ Windows ซึ่งต่อ Docker ใน WSL ไม่ได้

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# อ่านเวอร์ชันจาก package.json เพื่อให้ตรงกับที่ทีมใช้ (devDependency "supabase")
CLI_VERSION="$(sed -n 's/.*"supabase": "[\^~]\{0,1\}\([0-9][^"]*\)".*/\1/p' "$REPO_ROOT/package.json" | head -n 1)"

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi
# node ที่อยู่ใต้ /mnt/ คือ node ของ Windows (มาจาก PATH ที่ WSL แชร์มา) — ใช้ไม่ได้
case "$(command -v node 2>/dev/null)" in
  /mnt/*|"")
    echo "ไม่พบ Node.js ของ Linux ใน WSL — รัน: wsl -d Ubuntu-24.04 -- bash scripts/wsl/install-node.sh" >&2
    exit 1
    ;;
esac

# รัน npx นอก repo ไม่งั้น npx จะไปใช้ node_modules/supabase ของ Windows
cd "$HOME" || exit 1
exec npx --yes "supabase@${CLI_VERSION:-latest}" --workdir "$REPO_ROOT" "$@"
