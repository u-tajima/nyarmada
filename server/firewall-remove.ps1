# NYARMADA LAN公開を終了するときに実行（管理者で実行）
# 旧名称で作成したルールが残っている場合も一緒に削除する
Remove-NetFirewallRule -DisplayName 'NYARMADA (LAN 8080)' -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName 'ANGRA CATS (LAN 8080)' -ErrorAction SilentlyContinue
