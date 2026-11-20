# NYARMADA LAN公開用 最小ファイアウォールルール（管理者で実行）
# 同一サブネットから / TCP 8080 / node.exe への受信のみ許可
Remove-NetFirewallRule -DisplayName 'NYARMADA (LAN 8080)' -ErrorAction SilentlyContinue
New-NetFirewallRule `
  -DisplayName 'NYARMADA (LAN 8080)' `
  -Description 'NYARMADA game server: same-subnet only, TCP 8080, node.exe only' `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 `
  -RemoteAddress LocalSubnet `
  -Program 'C:\Program Files\nodejs\node.exe' `
  -Profile Public,Private | Out-Null
