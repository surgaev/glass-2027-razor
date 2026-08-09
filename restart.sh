#!/bin/bash
pkill -f "Projects/glass" 2>/dev/null
sleep 1
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
export OPENAI_TRANSCRIBE_LANG="ru"
cd ~/Projects/glass
nohup npm start > /tmp/glass-start.log 2>&1 &
disown
echo "Glass запущен. Логи: /tmp/glass-start.log"
