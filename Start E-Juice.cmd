@echo off
rem Starts the e-juice calculator and opens it in your default browser.
rem Always uses http://localhost:5173 - your data is tied to that address.
rem Keep this window open while using the app; close it to stop the app.
title E-Juice Calculator
cd /d "%~dp0"

rem Already running? Just open the page.
netstat -ano | findstr /r /c:":5173 .*LISTENING" >nul && (
  start "" http://localhost:5173
  exit /b
)

if not exist node_modules call npm install
call npm run dev -- --port 5173 --strictPort --open
